"""Pomodoro session endpoints — start, complete, abandon, stats."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.db import Database, get_db, new_id, utcnow_iso
from app.core.security import CurrentUser, get_current_user
from app.services import gamification

router = APIRouter(prefix="/pomodoro", tags=["pomodoro"])

XP_PER_SESSION = 15  # full 25-min session
XP_PARTIAL     = 5   # abandoned but ≥ 10 min


class StartRequest(BaseModel):
    task_id: Optional[str] = None
    duration_minutes: int = 25


class CompleteRequest(BaseModel):
    session_id: str
    completed: bool = True


@router.post("/start")
async def start_session(
    payload: StartRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    session = db.insert("pomodoro_sessions", {
        "id": new_id(),
        "user_id": user.id,
        "task_id": payload.task_id,
        "duration_minutes": payload.duration_minutes,
        "completed": False,
        "started_at": utcnow_iso(),
    })
    return {"session_id": session["id"], "started_at": session["started_at"]}


@router.post("/complete")
async def complete_session(
    payload: CompleteRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    rows = db.list("pomodoro_sessions", {"id": payload.session_id, "user_id": user.id})
    if not rows:
        raise HTTPException(status_code=404, detail="Session not found")
    session = rows[0]

    ended_at = datetime.now(timezone.utc)
    started  = datetime.fromisoformat(session["started_at"].replace("Z", "+00:00"))
    elapsed  = (ended_at - started).total_seconds() / 60

    xp = 0
    badge = None
    if payload.completed:
        xp = XP_PER_SESSION
    elif elapsed >= 10:
        xp = XP_PARTIAL

    db.update("pomodoro_sessions", payload.session_id, {
        "completed": payload.completed,
        "ended_at": ended_at.isoformat(),
    })

    if xp:
        reason = "pomodoro_complete" if payload.completed else "pomodoro_partial"
        gamification.award_xp(db, user.id, xp, reason)

    # Check for first-session badge
    all_sessions = db.list("pomodoro_sessions", {"user_id": user.id})
    completed_count = sum(1 for s in all_sessions if s.get("completed"))
    if completed_count == 1:
        badge = "first_pomodoro"
        gamification.award_badge(db, user.id, badge)
    elif completed_count == 10:
        badge = "focus_master"
        gamification.award_badge(db, user.id, badge)

    return {
        "xp_awarded": xp,
        "elapsed_minutes": round(elapsed, 1),
        "badge": badge,
        "completed_count": completed_count,
    }


@router.get("/stats")
async def get_stats(
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    sessions = db.list("pomodoro_sessions", {"user_id": user.id})
    completed = [s for s in sessions if s.get("completed")]
    total_minutes = sum(s.get("duration_minutes", 25) for s in completed)
    return {
        "total_sessions": len(completed),
        "total_minutes": total_minutes,
        "total_hours": round(total_minutes / 60, 1),
        "sessions": sorted(sessions, key=lambda s: s.get("started_at", ""), reverse=True)[:20],
    }


@router.get("/task/{task_id}")
async def task_stats(
    task_id: str,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    sessions = [s for s in db.list("pomodoro_sessions", {"user_id": user.id}) if s.get("task_id") == task_id]
    completed = [s for s in sessions if s.get("completed")]
    return {
        "task_id": task_id,
        "sessions": len(completed),
        "total_minutes": sum(s.get("duration_minutes", 25) for s in completed),
    }
