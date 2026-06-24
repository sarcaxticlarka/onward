"""Natural-language task parsing, AI decomposition, and priority scoring."""
from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.services.llm_router import LLMProviderError, route_llm

_JSON_BLOCK_RE = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json(text: str) -> Optional[dict]:
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = _JSON_BLOCK_RE.search(text)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _naive_deadline_fallback(raw_input: str) -> Optional[str]:
    """Very small heuristic fallback when no LLM provider is available."""
    now = datetime.now(timezone.utc)
    lower = raw_input.lower()
    if "tomorrow" in lower:
        return (now + timedelta(days=1)).replace(hour=23, minute=59, second=0, microsecond=0).isoformat()
    if "today" in lower or "tonight" in lower:
        return now.replace(hour=23, minute=59, second=0, microsecond=0).isoformat()
    weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, day in enumerate(weekdays):
        if day in lower:
            days_ahead = (i - now.weekday()) % 7
            days_ahead = days_ahead or 7
            return (now + timedelta(days=days_ahead)).replace(hour=23, minute=59, second=0, microsecond=0).isoformat()
    return None


async def parse_natural_language_task(raw_input: str) -> Dict[str, Any]:
    """Use the LLM Router (Groq, fast path) to extract structured task fields
    from free text. Falls back to a naive heuristic parse if no provider key
    is configured, so task creation never hard-fails.
    """
    system = (
        "You convert a user's free-text task description into structured JSON. "
        "Return ONLY a JSON object with keys: title (string), deadline (ISO-8601 "
        "datetime string or null), priority (one of low/medium/high/critical), "
        "category (short string or null), estimated_minutes (integer or null). "
        f"Assume current UTC time is {datetime.now(timezone.utc).isoformat()}. "
        "No prose, no markdown fences."
    )
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": raw_input},
    ]
    try:
        text = await route_llm("deadline_parse", messages)
        parsed = _extract_json(text)
        if parsed and parsed.get("title"):
            parsed.setdefault("priority", "medium")
            return parsed
    except LLMProviderError:
        pass

    # Graceful degradation without any LLM key configured.
    return {
        "title": raw_input.strip()[:200],
        "deadline": _naive_deadline_fallback(raw_input),
        "priority": "medium",
        "category": None,
        "estimated_minutes": None,
    }


async def decompose_task(title: str, description: Optional[str], deadline: Optional[str]) -> List[Dict[str, Any]]:
    """Use Claude (complex reasoning) to break a task into an ordered subtask
    list with time estimates. Falls back to a generic 3-step breakdown if no
    provider is configured.
    """
    system = (
        "You break a task into 3-6 concrete, ordered subtasks with time "
        "estimates in minutes. Return ONLY a JSON object: "
        '{"subtasks": [{"title": str, "estimated_minutes": int, "order": int}, ...]}. '
        "No prose, no markdown fences."
    )
    user_content = f"Task: {title}\nDescription: {description or 'n/a'}\nDeadline: {deadline or 'n/a'}"
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_content},
    ]
    try:
        text = await route_llm("decomposition", messages)
        parsed = _extract_json(text)
        if parsed and parsed.get("subtasks"):
            return parsed["subtasks"]
    except LLMProviderError:
        pass

    return [
        {"title": f"Plan: {title}", "estimated_minutes": 15, "order": 0},
        {"title": f"Work on: {title}", "estimated_minutes": 60, "order": 1},
        {"title": f"Review & finalize: {title}", "estimated_minutes": 15, "order": 2},
    ]


def compute_priority_score(
    deadline: Optional[str],
    user_weight: float = 0.5,
    ai_confidence: float = 0.5,
) -> float:
    """Priority scoring engine (0-100): combines deadline proximity,
    user-set weight (0-1), and AI confidence (0-1).

    Weighting: 50% deadline proximity, 30% user weight, 20% AI confidence.
    """
    proximity_score = 0.0
    if deadline:
        try:
            dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            hours_remaining = (dl - now).total_seconds() / 3600
            if hours_remaining <= 0:
                proximity_score = 100
            elif hours_remaining >= 24 * 14:
                proximity_score = 5
            else:
                # inverse-linear decay over 14 days
                proximity_score = max(0, 100 - (hours_remaining / (24 * 14)) * 100)
        except (ValueError, TypeError):
            proximity_score = 30
    else:
        proximity_score = 20

    score = (proximity_score * 0.5) + (user_weight * 100 * 0.3) + (ai_confidence * 100 * 0.2)
    return round(min(100, max(0, score)), 2)


PRIORITY_WEIGHTS = {"low": 0.2, "medium": 0.5, "high": 0.8, "critical": 1.0}
