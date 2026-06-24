"""Analytics: completion rate, focus heatmap, AI weekly summary."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.core.db import Database
from app.services.llm_router import LLMProviderError, route_llm


def completion_rate(db: Database, user_id: str, granularity: str = "day", days: int = 30) -> List[Dict[str, Any]]:
    tasks = db.list("tasks", {"user_id": user_id})
    buckets: Dict[str, Dict[str, int]] = defaultdict(lambda: {"completed": 0, "total": 0})

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    for t in tasks:
        created = t.get("created_at")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        if dt < cutoff:
            continue
        if granularity == "week":
            key = (dt - timedelta(days=dt.weekday())).strftime("%Y-%m-%d")
        elif granularity == "month":
            key = dt.strftime("%Y-%m")
        else:
            key = dt.strftime("%Y-%m-%d")
        buckets[key]["total"] += 1
        if t.get("status") == "completed":
            buckets[key]["completed"] += 1

    out = []
    for key in sorted(buckets.keys()):
        b = buckets[key]
        rate = (b["completed"] / b["total"]) if b["total"] else 0
        out.append({"period": key, "completed": b["completed"], "total": b["total"], "rate": round(rate, 3)})
    return out


def focus_heatmap(db: Database, user_id: str) -> List[Dict[str, Any]]:
    """GitHub-style grid: day-of-week x hour-of-day completion counts."""
    tasks = [t for t in db.list("tasks", {"user_id": user_id}) if t.get("status") == "completed" and t.get("completed_at")]
    grid: Dict[tuple, int] = defaultdict(int)
    for t in tasks:
        try:
            dt = datetime.fromisoformat(t["completed_at"].replace("Z", "+00:00"))
        except (ValueError, TypeError, KeyError):
            continue
        grid[(dt.weekday(), dt.hour)] += 1
    return [{"day_of_week": d, "hour": h, "count": c} for (d, h), c in sorted(grid.items())]


async def generate_weekly_summary(db: Database, user_id: str) -> str:
    rate_data = completion_rate(db, user_id, granularity="day", days=7)
    total_completed = sum(r["completed"] for r in rate_data)
    total_tasks = sum(r["total"] for r in rate_data)
    overall_rate = round((total_completed / total_tasks) * 100, 1) if total_tasks else 0

    system = (
        "You are a productivity coach. Summarize the user's week in exactly "
        "3 sentences, with one actionable recommendation. Be encouraging but honest."
    )
    user_content = (
        f"This week: {total_completed}/{total_tasks} tasks completed "
        f"({overall_rate}% completion rate)."
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    try:
        return await route_llm("reasoning", messages)
    except LLMProviderError:
        return (
            f"You completed {total_completed} of {total_tasks} tasks this week "
            f"({overall_rate}% completion rate). "
            "Keep tackling high-priority items early to avoid last-minute crunches. "
            "Consider blocking focus time for your most-delayed task category."
        )
