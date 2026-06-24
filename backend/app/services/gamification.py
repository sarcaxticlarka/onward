"""XP, levels, badges, streaks, leaderboard."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.core.db import Database, utcnow_iso

LEVEL_THRESHOLDS = [
    (0, "Procrastinator"),
    (100, "Planner"),
    (400, "Achiever"),
    (1000, "Legend"),
]

BADGE_DEFINITIONS = {
    "early_bird": "Early Bird — completed 5 tasks before deadline",
    "streak_master": "Streak Master — 7-day completion streak",
    "crisis_survivor": "Crisis Survivor — survived a Crisis Mode session",
}


def level_for_xp(xp: int) -> str:
    level = LEVEL_THRESHOLDS[0][1]
    for threshold, name in LEVEL_THRESHOLDS:
        if xp >= threshold:
            level = name
    return level


def _week_start_iso() -> str:
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=now.weekday())
    return start.strftime("%Y-%m-%d")


def award_xp(db: Database, user_id: str, amount: int, reason: str) -> int:
    db.insert("xp_events", {"user_id": user_id, "amount": amount, "reason": reason, "created_at": utcnow_iso()})

    week_start = _week_start_iso()
    existing = db.list("leaderboard", {"user_id": user_id})
    if existing:
        row = existing[0]
        new_total = (row.get("total_xp") or 0) + amount
        new_week = (row.get("week_xp") or 0) + amount if row.get("week_start") == week_start else amount
        db.update("leaderboard", user_id, {"total_xp": new_total, "week_xp": new_week, "week_start": week_start}, id_col="user_id")
        return new_total
    else:
        db.insert("leaderboard", {"user_id": user_id, "total_xp": amount, "week_xp": amount, "week_start": week_start, "display_name": None})
        return amount


def get_total_xp(db: Database, user_id: str) -> int:
    rows = db.list("leaderboard", {"user_id": user_id})
    return rows[0]["total_xp"] if rows else 0


def award_badge(db: Database, user_id: str, badge_key: str) -> bool:
    existing = [b for b in db.list("badges", {"user_id": user_id}) if b.get("badge_key") == badge_key]
    if existing:
        return False
    db.insert("badges", {"user_id": user_id, "badge_key": badge_key, "awarded_at": utcnow_iso()})
    return True


def get_badges(db: Database, user_id: str) -> List[str]:
    return [b["badge_key"] for b in db.list("badges", {"user_id": user_id})]


def compute_streak_days(db: Database, user_id: str) -> int:
    tasks = [t for t in db.list("tasks", {"user_id": user_id}) if t.get("status") == "completed" and t.get("completed_at")]
    days = set()
    for t in tasks:
        try:
            d = datetime.fromisoformat(t["completed_at"].replace("Z", "+00:00")).date()
            days.add(d)
        except (ValueError, TypeError, KeyError):
            continue
    if not days:
        return 0
    streak = 0
    cursor = datetime.now(timezone.utc).date()
    while cursor in days:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return streak


def on_task_completed(db: Database, user_id: str, task: Dict[str, Any]) -> Dict[str, Any]:
    """Award XP/badges when a task transitions to completed. Returns summary of awards."""
    awards: Dict[str, Any] = {"xp_awarded": 0, "badges_awarded": []}

    xp = 10
    before_deadline = False
    deadline = task.get("deadline")
    if deadline:
        try:
            dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) <= dl:
                xp += 25
                before_deadline = True
        except (ValueError, TypeError):
            pass

    award_xp(db, user_id, xp, reason=f"task_completed:{task.get('id')}")
    awards["xp_awarded"] = xp

    if before_deadline:
        completed_before_deadline = sum(
            1 for t in db.list("tasks", {"user_id": user_id, "status": "completed"})
            if t.get("deadline") and t.get("completed_at") and t["completed_at"] <= t["deadline"]
        )
        if completed_before_deadline >= 5 and award_badge(db, user_id, "early_bird"):
            awards["badges_awarded"].append("early_bird")

    streak = compute_streak_days(db, user_id)
    if streak >= 7 and award_badge(db, user_id, "streak_master"):
        awards["badges_awarded"].append("streak_master")

    return awards


def on_crisis_survived(db: Database, user_id: str) -> Dict[str, Any]:
    award_xp(db, user_id, 50, reason="crisis_survival")
    awarded = award_badge(db, user_id, "crisis_survivor")
    return {"xp_awarded": 50, "badges_awarded": ["crisis_survivor"] if awarded else []}


def get_profile(db: Database, user_id: str) -> Dict[str, Any]:
    xp = get_total_xp(db, user_id)
    return {
        "user_id": user_id,
        "xp": xp,
        "level": level_for_xp(xp),
        "badges": get_badges(db, user_id),
        "streak_days": compute_streak_days(db, user_id),
    }


def get_leaderboard(db: Database, limit: int = 20) -> List[Dict[str, Any]]:
    rows = db.list("leaderboard")
    rows.sort(key=lambda r: r.get("week_xp", 0), reverse=True)
    entries = []
    for i, r in enumerate(rows[:limit]):
        entries.append({
            "user_id": r["user_id"],
            "display_name": r.get("display_name"),
            "xp": r.get("week_xp", 0),
            "rank": i + 1,
        })
    return entries
