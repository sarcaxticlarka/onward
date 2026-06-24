"""Escalating notification logic: subtle -> urgent -> crisis."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.core.db import Database, utcnow_iso

ESCALATION_THRESHOLDS_HOURS = [
    (1, "crisis"),
    (6, "urgent"),
    (24, "subtle"),
]


def escalation_level_for_deadline(deadline: Optional[str]) -> Optional[str]:
    if not deadline:
        return None
    try:
        dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return None
    hours_remaining = (dl - datetime.now(timezone.utc)).total_seconds() / 3600
    if hours_remaining < 0:
        return "crisis"
    for threshold, level in ESCALATION_THRESHOLDS_HOURS:
        if hours_remaining <= threshold:
            return level
    return None


def build_message(level: str, task_title: str) -> str:
    if level == "crisis":
        return f"CRISIS: '{task_title}' is overdue or due within the hour!"
    if level == "urgent":
        return f"Urgent: '{task_title}' is due soon — act now."
    return f"Reminder: '{task_title}' is coming up."


def create_notification(db: Database, user_id: str, task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    level = escalation_level_for_deadline(task.get("deadline"))
    if not level:
        return None
    return db.insert("notifications", {
        "task_id": task.get("id"),
        "user_id": user_id,
        "type": "deadline_escalation",
        "message": build_message(level, task.get("title", "task")),
        "sent_at": utcnow_iso(),
        "acknowledged": 0,
        "escalation_level": level,
    })


def scan_and_notify(db: Database, user_id: str) -> list:
    tasks = [t for t in db.list("tasks", {"user_id": user_id}) if t.get("status") not in ("completed",) and not t.get("deleted_at")]
    created = []
    for t in tasks:
        notif = create_notification(db, user_id, t)
        if notif:
            created.append(notif)
    return created
