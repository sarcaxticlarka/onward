"""Agent endpoints: chat (SSE), plan, crisis, sessions."""
from __future__ import annotations

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from app.agent import crisis as crisis_module
from app.agent.graph import run_agent
from app.core.db import Database, get_db, utcnow_iso
from app.core.security import CurrentUser, decode_token, get_current_user
from app.models.schemas import (
    AgentChatRequest,
    AgentPlanRequest,
    AgentPlanResponse,
    CrisisRequest,
    CrisisResponse,
    SessionResponse,
)
from app.services import calendar_service, gamification

router = APIRouter(prefix="/agent", tags=["agent"])


async def _gather_context(db: Database, user_id: str):
    tasks = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at")]
    calendar_context = await calendar_service.list_events(db, user_id, days=7)
    return tasks, calendar_context


def _persist_session(db: Database, user_id: str, mode: str, plan: dict, actions_taken: list, messages: list) -> dict:
    return db.insert("sessions", {
        "user_id": user_id,
        "started_at": utcnow_iso(),
        "ended_at": utcnow_iso(),
        "mode": mode,
        "ai_plan": plan,
        "actions_taken": actions_taken,
        "messages": messages,
    })


@router.post("/chat")
async def chat(payload: AgentChatRequest, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """Streams the agent's response as Server-Sent Events."""
    tasks, calendar_context = await _gather_context(db, user.id)

    async def event_stream():
        yield f"event: status\ndata: {json.dumps({'message': 'Reading your tasks and calendar...'})}\n\n"
        result = await run_agent(
            db=db,
            user_id=user.id,
            user_message=payload.message,
            task_list=tasks,
            calendar_context=calendar_context,
        )
        for action in result.get("actions_taken", []):
            yield f"event: tool\ndata: {json.dumps(action, default=str)}\n\n"

        session = _persist_session(
            db, user.id, "chat",
            plan=result.get("plan", {}),
            actions_taken=result.get("actions_taken", []),
            messages=[{"role": "user", "content": payload.message}, {"role": "assistant", "content": result.get("final_response", "")}],
        )

        final_payload = {
            "session_id": session["id"],
            "response": result.get("final_response", ""),
            "plan": result.get("plan", {}),
        }
        yield f"event: final\ndata: {json.dumps(final_payload, default=str)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.websocket("/ws")
async def agent_ws(websocket: WebSocket):
    """WebSocket counterpart to /agent/chat for real-time streaming.

    Auth: client sends `{"token": "<access_token>"}` as the first message.
    """
    await websocket.accept()
    db = get_db()
    try:
        auth_msg = await websocket.receive_json()
        token = auth_msg.get("token")
        if not token:
            await websocket.send_json({"event": "error", "data": "missing token"})
            await websocket.close()
            return
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            await websocket.send_json({"event": "error", "data": "invalid token"})
            await websocket.close()
            return

        while True:
            msg = await websocket.receive_json()
            user_message = msg.get("message", "")
            tasks, calendar_context = await _gather_context(db, user_id)
            await websocket.send_json({"event": "status", "data": "Reading your tasks and calendar..."})
            result = await run_agent(db=db, user_id=user_id, user_message=user_message, task_list=tasks, calendar_context=calendar_context)
            for action in result.get("actions_taken", []):
                await websocket.send_json({"event": "tool", "data": json.loads(json.dumps(action, default=str))})
            session = _persist_session(
                db, user_id, "chat",
                plan=result.get("plan", {}),
                actions_taken=result.get("actions_taken", []),
                messages=[{"role": "user", "content": user_message}, {"role": "assistant", "content": result.get("final_response", "")}],
            )
            await websocket.send_json({
                "event": "final",
                "data": {"session_id": session["id"], "response": result.get("final_response", ""), "plan": result.get("plan", {})},
            })
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001
        try:
            await websocket.send_json({"event": "error", "data": str(exc)})
        except Exception:  # noqa: BLE001
            pass


@router.post("/plan", response_model=AgentPlanResponse)
async def plan(payload: AgentPlanRequest, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    tasks, calendar_context = await _gather_context(db, user.id)
    message = payload.goal or f"Create a schedule plan for the next {payload.window_days} days."
    result = await run_agent(db=db, user_id=user.id, user_message=message, task_list=tasks, calendar_context=calendar_context)
    session = _persist_session(
        db, user.id, "plan",
        plan=result.get("plan", {}),
        actions_taken=result.get("actions_taken", []),
        messages=[{"role": "user", "content": message}, {"role": "assistant", "content": result.get("final_response", "")}],
    )
    full_plan = dict(result.get("plan", {}))
    full_plan["response"] = result.get("final_response", "")
    full_plan["actions_taken"] = result.get("actions_taken", [])
    return AgentPlanResponse(session_id=session["id"], plan=full_plan)


@router.post("/crisis", response_model=CrisisResponse)
async def trigger_crisis(payload: CrisisRequest, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    crisis_tasks = crisis_module.find_crisis_tasks(db, user.id)
    is_active = len(crisis_tasks) >= crisis_module.CRISIS_TASK_COUNT_THRESHOLD or payload.force
    if not is_active:
        return CrisisResponse(session_id="", crisis=False, triggering_tasks=[], battle_plan={})

    battle_plan = await crisis_module.build_battle_plan(db, user.id, crisis_tasks)
    xp_result = gamification.on_crisis_survived(db, user.id)
    battle_plan["xp_awarded"] = xp_result

    session = _persist_session(
        db, user.id, "crisis",
        plan=battle_plan,
        actions_taken=[{"tool": "crisis_reprioritize", "result": {"task_count": len(crisis_tasks)}}],
        messages=[],
    )

    from app.api.tasks import _to_response
    return CrisisResponse(
        session_id=session["id"],
        crisis=True,
        triggering_tasks=[_to_response(t) for t in crisis_tasks],
        battle_plan=battle_plan,
    )


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions(user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    rows = db.list("sessions", {"user_id": user.id}, order_by="-started_at")
    return [SessionResponse(**r) for r in rows]


@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    row = db.get("sessions", session_id)
    if not row or row.get("user_id") != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(**row)
