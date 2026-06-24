"""Agent tool functions: calendar_read, calendar_write, task_decompose,
conflict_detect, task_prioritize, send_notification.

Each tool takes the Database handle + user_id plus tool-specific args and
returns a JSON-serializable dict. Kept as plain async functions (rather than
framework-specific tool decorators) so they can be invoked directly by the
LangGraph ToolExecutor node or unit-tested in isolation.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.core.db import Database, utcnow_iso
from app.services import calendar_service, notifications, task_parser


async def calendar_read(db: Database, user_id: str, days: int = 7) -> Dict[str, Any]:
    events = await calendar_service.list_events(db, user_id, days=days)
    return {"events": events, "count": len(events)}


async def calendar_write(
    db: Database, user_id: str, title: str, start: str, end: str, description: Optional[str] = None
) -> Dict[str, Any]:
    try:
        event = await calendar_service.create_event(db, user_id, title, start, end, description)
        return {"created": True, "event": event}
    except calendar_service.CalendarNotConnectedError as exc:
        return {"created": False, "error": str(exc)}


async def task_decompose(db: Database, user_id: str, task_id: str) -> Dict[str, Any]:
    task = db.get("tasks", task_id)
    if not task or task.get("user_id") != user_id:
        return {"error": "task not found"}
    subtasks_raw = await task_parser.decompose_task(task["title"], task.get("description"), task.get("deadline"))
    created = []
    for s in subtasks_raw:
        row = db.insert("tasks", {
            "user_id": user_id,
            "title": s.get("title", "subtask"),
            "description": None,
            "deadline": task.get("deadline"),
            "priority": task.get("priority", "medium"),
            "category": task.get("category"),
            "status": "pending",
            "parent_task_id": task_id,
            "ai_score": 0,
            "estimated_minutes": s.get("estimated_minutes"),
            "created_at": utcnow_iso(),
        })
        created.append(row)
    return {"parent_task_id": task_id, "subtasks": created}


async def conflict_detect(db: Database, user_id: str, days: int = 7) -> Dict[str, Any]:
    tasks = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at") and t.get("status") != "completed"]
    events = await calendar_service.list_events(db, user_id, days=days)
    conflicts = calendar_service.detect_conflicts(tasks, events)
    return {"conflicts": conflicts, "count": len(conflicts)}


async def task_prioritize(db: Database, user_id: str) -> Dict[str, Any]:
    tasks = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at") and t.get("status") != "completed"]
    score_map = {}
    for t in tasks:
        weight = task_parser.PRIORITY_WEIGHTS.get(t.get("priority", "medium"), 0.5)
        score_map[t["id"]] = task_parser.compute_priority_score(t.get("deadline"), user_weight=weight, ai_confidence=0.6)

    if score_map and db.is_postgres:
        whens = " ".join(f"WHEN id = %s THEN %s" for _ in score_map)
        ids_tuple = tuple(score_map.keys())
        params: list = []
        for tid, score in score_map.items():
            params.extend([tid, float(score)])
        params.extend(ids_tuple)
        raw_sql = (
            f"UPDATE tasks SET ai_score = CASE {whens} END "
            f"WHERE id IN ({','.join(['%s']*len(ids_tuple))})"
        )
        db._local.execute_raw(raw_sql, tuple(params))  # noqa: SLF001
    else:
        for tid, score in score_map.items():
            db.update("tasks", tid, {"ai_score": score})

    updated = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at") and t.get("status") != "completed"]
    updated.sort(key=lambda t: t.get("ai_score") or 0, reverse=True)
    return {"prioritized": updated[:20]}


async def send_notification(db: Database, user_id: str, task_id: Optional[str] = None) -> Dict[str, Any]:
    if task_id:
        task = db.get("tasks", task_id)
        tasks = [task] if task else []
    else:
        tasks = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at") and t.get("status") != "completed"]
    created = []
    for t in tasks:
        notif = notifications.create_notification(db, user_id, t)
        if notif:
            created.append(notif)
    return {"notifications": created}


TOOL_REGISTRY = {
    "calendar_read": calendar_read,
    "calendar_write": calendar_write,
    "task_decompose": task_decompose,
    "conflict_detect": conflict_detect,
    "task_prioritize": task_prioritize,
    "send_notification": send_notification,
}
