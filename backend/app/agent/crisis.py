"""Crisis Mode: triggers when 3+ high-priority tasks are due within 24h.

Produces a full backlog reprioritization, an emergency hour-by-hour schedule,
and a cohesive "battle plan" explanation of what to deprioritize and why.
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from app.core.db import Database
from app.services import task_parser
from app.services.llm_router import LLMProviderError, route_llm

CRISIS_TASK_COUNT_THRESHOLD = 3
CRISIS_WINDOW_HOURS = 24
HIGH_PRIORITIES = {"high", "critical"}


def find_crisis_tasks(db: Database, user_id: str) -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(hours=CRISIS_WINDOW_HOURS)
    tasks = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at") and t.get("status") != "completed"]
    crisis_tasks = []
    for t in tasks:
        deadline = t.get("deadline")
        if not deadline or t.get("priority") not in HIGH_PRIORITIES:
            continue
        try:
            dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        if now <= dl <= window_end:
            crisis_tasks.append(t)
    return crisis_tasks


def is_crisis(db: Database, user_id: str) -> bool:
    return len(find_crisis_tasks(db, user_id)) >= CRISIS_TASK_COUNT_THRESHOLD


async def build_battle_plan(db: Database, user_id: str, crisis_tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
    # Full backlog reprioritization — batch all score updates in one SQL to avoid N+1
    all_open = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at") and t.get("status") != "completed"]
    crisis_ids = {c["id"] for c in crisis_tasks}

    # Compute scores locally, then bulk-update via a single CASE WHEN statement
    score_map: Dict[str, float] = {}
    for t in all_open:
        weight = task_parser.PRIORITY_WEIGHTS.get(t.get("priority", "medium"), 0.5)
        confidence = 0.9 if t["id"] in crisis_ids else 0.5
        score_map[t["id"]] = task_parser.compute_priority_score(t.get("deadline"), user_weight=weight, ai_confidence=confidence)

    if score_map and db.is_postgres:
        from decimal import Decimal
        # Build a single UPDATE … SET ai_score = CASE WHEN id = %s THEN %s … END
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

    # Re-read the updated list in one query (not N individual GETs)
    all_updated = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at") and t.get("status") != "completed"]
    reprioritized = sorted(all_updated, key=lambda t: t.get("ai_score") or 0, reverse=True)

    system = (
        "You are a crisis-mode productivity agent. The user has 3+ high-priority "
        "tasks due within 24 hours. Produce a JSON battle plan: "
        '{"hour_by_hour": [{"time": str, "action": str, "task_id": str|null}], '
        '"deprioritized": [{"task_id": str, "reason": str}], '
        '"message": str}. The message should be urgent but encouraging, max 3 sentences. '
        "No prose outside JSON, no markdown fences."
    )
    user_content = json.dumps({
        "crisis_tasks": [{"id": t["id"], "title": t["title"], "deadline": t.get("deadline")} for t in crisis_tasks],
        "all_open_tasks": [{"id": t["id"], "title": t["title"], "priority": t.get("priority"), "ai_score": t.get("ai_score")} for t in reprioritized[:15]],
        "now": datetime.now(timezone.utc).isoformat(),
    }, default=str)
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    try:
        text = await route_llm("reasoning", messages)
        plan = json.loads(text)
    except (LLMProviderError, json.JSONDecodeError, ValueError):
        plan = _fallback_battle_plan(crisis_tasks, reprioritized)

    plan["reprioritized_task_ids"] = [t["id"] for t in reprioritized]
    return plan


def _fallback_battle_plan(crisis_tasks: List[Dict[str, Any]], reprioritized: List[Dict[str, Any]]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    hour_by_hour = []
    for i, t in enumerate(crisis_tasks):
        slot_start = now + timedelta(hours=i * 2)
        hour_by_hour.append({
            "time": slot_start.strftime("%H:%M"),
            "action": f"Focus block: {t['title']}",
            "task_id": t["id"],
        })
    deprioritized = [
        {"task_id": t["id"], "reason": "Lower urgency than crisis tasks; deferred."}
        for t in reprioritized
        if t["id"] not in {c["id"] for c in crisis_tasks}
    ][:5]
    return {
        "hour_by_hour": hour_by_hour,
        "deprioritized": deprioritized,
        "message": (
            f"You have {len(crisis_tasks)} urgent tasks due within 24 hours. "
            "I've reprioritized your backlog and blocked focus time for each. "
            "Stay heads-down on the top items first. (LLM provider unavailable — automated plan.)"
        ),
    }
