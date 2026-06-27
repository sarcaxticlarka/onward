"""Analytics endpoints: weekly summary, completion rate, focus heatmap, streak."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from collections import defaultdict

from fastapi import APIRouter, Depends, Query

from app.core.db import Database, get_db
from app.core.security import CurrentUser, get_current_user
from app.models.schemas import CompletionRateResponse, HeatmapResponse, SummaryResponse
from app.services import analytics, gamification

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=SummaryResponse)
async def summary(user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    text = await analytics.generate_weekly_summary(db, user.id)
    return SummaryResponse(summary=text, period="week")


@router.get("/completion-rate", response_model=CompletionRateResponse)
async def completion_rate(
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    days: int = Query(30, ge=1, le=365),
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    data = analytics.completion_rate(db, user.id, granularity=granularity, days=days)
    return CompletionRateResponse(granularity=granularity, data=data)


@router.get("/focus-heatmap", response_model=HeatmapResponse)
async def focus_heatmap(user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    data = analytics.focus_heatmap(db, user.id)
    return HeatmapResponse(data=data)


@router.get("/streak")
async def streak(user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """Returns streak data + daily completion counts for the past 365 days (GitHub heatmap)."""
    tasks = [
        t for t in db.list("tasks", {"user_id": user.id})
        if t.get("status") == "completed" and (t.get("completed_at") or t.get("updated_at"))
    ]

    # Build day → count map
    day_counts: dict[str, int] = defaultdict(int)
    for t in tasks:
        raw = t.get("completed_at") or t.get("updated_at") or ""
        try:
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            day_counts[dt.date().isoformat()] += 1
        except (ValueError, TypeError):
            pass

    # Build 365-day grid (Sunday-aligned, like GitHub)
    today = date.today()
    start = today - timedelta(days=364)
    # Pad to Sunday
    start -= timedelta(days=start.weekday() + 1 if start.weekday() != 6 else 0)

    grid = []
    d = start
    while d <= today:
        grid.append({"date": d.isoformat(), "count": day_counts.get(d.isoformat(), 0)})
        d += timedelta(days=1)

    # Compute current streak (consecutive days with ≥1 completion, working backwards from today)
    current_streak = 0
    check = today
    while True:
        if day_counts.get(check.isoformat(), 0) > 0:
            current_streak += 1
            check -= timedelta(days=1)
        else:
            break

    # Longest streak ever
    longest = 0
    run = 0
    for cell in grid:
        if cell["count"] > 0:
            run += 1
            longest = max(longest, run)
        else:
            run = 0

    total_days_active = sum(1 for c in day_counts.values() if c > 0)
    total_completed   = sum(day_counts.values())

    # Award streak badges
    if current_streak >= 7:
        gamification.award_badge(db, user.id, "streak_7")
    if current_streak >= 30:
        gamification.award_badge(db, user.id, "streak_30")

    return {
        "grid": grid,
        "current_streak": current_streak,
        "longest_streak": longest,
        "total_days_active": total_days_active,
        "total_completed": total_completed,
    }


@router.get("/deadline-risk")
async def deadline_risk(user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """
    Predict deadline risk for each pending/in_progress task by comparing
    time remaining against the user's historical completion velocity.
    """
    now = datetime.now(timezone.utc)
    all_tasks = [t for t in db.list("tasks", {"user_id": user.id}) if not t.get("deleted_at")]

    # ── Build completion history ────────────────────────────────────────────
    # For each completed task, measure created_at → completed_at duration.
    history_by_priority: dict[str, list[float]] = defaultdict(list)  # priority → [hours]
    on_time_by_priority: dict[str, list[bool]]  = defaultdict(list)  # priority → [was_on_time]

    for t in all_tasks:
        if t.get("status") != "completed":
            continue
        try:
            created   = datetime.fromisoformat(str(t["created_at"]).replace("Z", "+00:00"))
            completed = datetime.fromisoformat(str(t.get("completed_at") or t.get("updated_at")).replace("Z", "+00:00"))
        except (TypeError, ValueError):
            continue
        hours_taken = (completed - created).total_seconds() / 3600
        priority    = t.get("priority", "medium")
        history_by_priority[priority].append(hours_taken)

        deadline_raw = t.get("deadline")
        if deadline_raw:
            try:
                dl = datetime.fromisoformat(str(deadline_raw).replace("Z", "+00:00"))
                on_time_by_priority[priority].append(completed <= dl)
            except (TypeError, ValueError):
                pass

    def avg_hours(priority: str) -> float | None:
        vals = history_by_priority.get(priority, [])
        return sum(vals) / len(vals) if vals else None

    def on_time_rate(priority: str) -> float | None:
        vals = on_time_by_priority.get(priority, [])
        return sum(vals) / len(vals) if vals else None

    # ── Score each active task ──────────────────────────────────────────────
    PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    results = []

    for t in all_tasks:
        if t.get("status") not in ("pending", "in_progress"):
            continue
        deadline_raw = t.get("deadline")
        if not deadline_raw:
            continue
        try:
            dl = datetime.fromisoformat(str(deadline_raw).replace("Z", "+00:00"))
        except (TypeError, ValueError):
            continue

        hours_remaining = (dl - now).total_seconds() / 3600
        priority = t.get("priority", "medium")
        avg_h    = avg_hours(priority)
        otr      = on_time_rate(priority)

        # ── Risk scoring (0–1) ─────────────────────────────────────────────
        risk_score = 0.0
        factors: list[str] = []

        # Factor 1 – already overdue
        if hours_remaining < 0:
            risk_score = 1.0
            factors.append("already past deadline")
        else:
            # Factor 2 – historically slow for this priority
            if avg_h is not None and hours_remaining < avg_h:
                ratio = hours_remaining / avg_h  # 0 = no time, 1 = exactly avg
                risk_score += (1 - ratio) * 0.55
                factors.append(f"you usually need ~{avg_h:.0f}h for {priority} tasks, only {hours_remaining:.0f}h left")

            # Factor 3 – historically often late for this priority
            if otr is not None and otr < 0.6:
                missed_pct = round((1 - otr) * 100)
                risk_score += (1 - otr) * 0.35
                factors.append(f"you miss {missed_pct}% of {priority}-priority deadlines")

            # Factor 4 – very little time remaining regardless of history
            if hours_remaining < 4:
                risk_score += 0.25
                factors.append(f"only {hours_remaining:.0f}h remaining")
            elif hours_remaining < 12:
                risk_score += 0.1
                factors.append(f"{hours_remaining:.0f}h until deadline")

        risk_score = min(1.0, risk_score)

        # ── Level label ────────────────────────────────────────────────────
        if risk_score >= 0.75:
            level = "critical"
        elif risk_score >= 0.45:
            level = "high"
        elif risk_score >= 0.2:
            level = "medium"
        else:
            level = "low"

        if level == "low":
            continue  # don't surface low-risk tasks in the panel

        # ── AI tip (fast, no extra latency for simple cases) ───────────────
        tip: str | None = None
        if risk_score >= 0.45 and avg_h is not None:
            if hours_remaining > 0:
                tip = (
                    f"Start now and aim to finish in {max(1, int(hours_remaining * 0.7)):.0f}h "
                    f"— your {priority}-priority tasks typically take {avg_h:.0f}h."
                )
            else:
                tip = "This task is overdue. Prioritize it above everything else or reschedule."

        results.append({
            "task_id":         t["id"],
            "task_title":      t.get("title", ""),
            "priority":        priority,
            "deadline":        deadline_raw,
            "hours_remaining": round(hours_remaining, 1),
            "risk_score":      round(risk_score, 3),
            "risk_level":      level,
            "factors":         factors[:2],  # top 2 most relevant
            "tip":             tip,
            "status":          t.get("status"),
        })

    # Sort: overdue first, then by risk score desc
    results.sort(key=lambda r: (-int(r["hours_remaining"] < 0), -r["risk_score"]))

    # ── Summary stats ──────────────────────────────────────────────────────
    total_active = len([t for t in all_tasks if t.get("status") in ("pending", "in_progress")])
    overall_otr  = None
    all_otr_vals = [v for vs in on_time_by_priority.values() for v in vs]
    if all_otr_vals:
        overall_otr = round(sum(all_otr_vals) / len(all_otr_vals) * 100)

    return {
        "at_risk":             results,
        "total_active_tasks":  total_active,
        "on_time_rate_pct":    overall_otr,
        "tasks_analyzed":      len(all_tasks),
    }


@router.get("/weekly-report")
async def weekly_report(user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    """Full weekly report: stats, AI narrative, badges, best day, suggestions."""
    now   = datetime.now(timezone.utc)
    today = date.today()

    # Week bounds (Mon–Sun)
    week_start = today - timedelta(days=today.weekday())       # Monday
    week_end   = week_start + timedelta(days=6)                # Sunday
    prev_start = week_start - timedelta(days=7)
    prev_end   = week_start - timedelta(days=1)

    all_tasks = [t for t in db.list("tasks", {"user_id": user.id}) if not t.get("deleted_at")]

    def in_range(t: dict, start: date, end: date) -> bool:
        raw = t.get("completed_at") or t.get("updated_at") or ""
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            return start <= dt.date() <= end
        except (ValueError, TypeError):
            return False

    this_week_done  = [t for t in all_tasks if t.get("status") == "completed" and in_range(t, week_start, week_end)]
    prev_week_done  = [t for t in all_tasks if t.get("status") == "completed" and in_range(t, prev_start, prev_end)]
    this_week_total = len([t for t in all_tasks if t.get("status") != "completed"]) + len(this_week_done)

    completion_rate_pct = round(len(this_week_done) / max(this_week_total, 1) * 100)
    prev_rate_pct       = round(len(prev_week_done) / max(len(prev_week_done) + 1, 1) * 100)
    delta_pct           = completion_rate_pct - prev_rate_pct

    # By-day breakdown (Mon=0 … Sun=6)
    DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_counts: dict[int, int] = defaultdict(int)
    for t in this_week_done:
        raw = t.get("completed_at") or t.get("updated_at") or ""
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            day_counts[dt.weekday()] += 1
        except (ValueError, TypeError):
            pass

    best_day_idx   = max(day_counts, key=lambda d: day_counts[d]) if day_counts else None
    best_day_label = DAY_NAMES[best_day_idx] if best_day_idx is not None else None
    best_day_count = day_counts.get(best_day_idx, 0) if best_day_idx is not None else 0

    daily_breakdown = [
        {"day": DAY_NAMES[i], "short": DAY_NAMES[i][:3], "count": day_counts.get(i, 0)}
        for i in range(7)
    ]

    # Priority breakdown
    priority_counts: dict[str, int] = defaultdict(int)
    for t in this_week_done:
        priority_counts[t.get("priority", "medium")] += 1

    # Pomodoro sessions this week
    pomodoro_rows = [
        r for r in db.list("pomodoro_sessions", {"user_id": user.id})
        if r.get("completed")
    ]
    pomodoro_this_week = []
    for r in pomodoro_rows:
        raw = r.get("ended_at") or r.get("started_at") or ""
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            if week_start <= dt.date() <= week_end:
                pomodoro_this_week.append(r)
        except (ValueError, TypeError):
            pass

    focus_minutes = sum(r.get("duration_minutes", 25) for r in pomodoro_this_week)
    focus_sessions = len(pomodoro_this_week)

    # Badges earned this week
    badge_rows = db.list("badges", {"user_id": user.id})
    badges_this_week = []
    for b in badge_rows:
        raw = b.get("earned_at") or b.get("created_at") or ""
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            if week_start <= dt.date() <= week_end:
                badges_this_week.append(b.get("badge_id") or b.get("type") or "badge")
        except (ValueError, TypeError):
            pass

    # XP earned this week
    xp_rows = db.list("xp_events", {"user_id": user.id})
    xp_this_week = 0
    for r in xp_rows:
        raw = r.get("created_at") or ""
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            if week_start <= dt.date() <= week_end:
                xp_this_week += r.get("amount", 0)
        except (ValueError, TypeError):
            pass

    # Current streak
    day_has_completion: dict[str, int] = defaultdict(int)
    for t in all_tasks:
        if t.get("status") != "completed":
            continue
        raw = t.get("completed_at") or t.get("updated_at") or ""
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            day_has_completion[dt.date().isoformat()] += 1
        except (ValueError, TypeError):
            pass

    streak = 0
    check  = today
    while day_has_completion.get(check.isoformat(), 0) > 0:
        streak += 1
        check -= timedelta(days=1)

    # AI narrative + suggestions (one Groq call)
    from app.services.llm_router import route_llm, LLMProviderError
    context = (
        f"User weekly stats: completed {len(this_week_done)} tasks "
        f"({completion_rate_pct}% rate, {'↑' if delta_pct >= 0 else '↓'}{abs(delta_pct)}% vs last week). "
        f"Focus sessions: {focus_sessions} ({focus_minutes}min). "
        f"Best day: {best_day_label or 'none'} ({best_day_count} tasks). "
        f"Badges earned: {len(badges_this_week)}. "
        f"Current streak: {streak} days. "
        f"Priority breakdown: {dict(priority_counts)}."
    )
    system = (
        "You are a friendly productivity coach generating a weekly report card. "
        "Return a JSON object with exactly these keys: "
        '"headline" (punchy 5-8 word title for this week, e.g. "Solid focus week — keep the momentum"), '
        '"narrative" (2 sentences: what went well + what to improve), '
        '"suggestions" (array of exactly 3 short actionable strings for next week). '
        "Be specific, encouraging, and honest. Return ONLY valid JSON."
    )
    headline   = "Solid week — keep building the habit."
    narrative  = f"You completed {len(this_week_done)} tasks this week with a {completion_rate_pct}% completion rate."
    suggestions = [
        "Block 2h of deep focus time on your best day.",
        "Tackle your highest-priority task before noon.",
        "Review your task list every Sunday evening.",
    ]
    try:
        raw_ai = await route_llm("reasoning", [
            {"role": "system", "content": system},
            {"role": "user", "content": context},
        ])
        import json as _json
        # Strip markdown code fences if present
        clean = raw_ai.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        parsed = _json.loads(clean)
        headline    = parsed.get("headline", headline)
        narrative   = parsed.get("narrative", narrative)
        suggestions = parsed.get("suggestions", suggestions)[:3]
    except Exception:
        pass  # fall back to defaults above

    return {
        "period": {
            "week_start":    week_start.isoformat(),
            "week_end":      week_end.isoformat(),
            "label":         f"{week_start.strftime('%b %d')} – {week_end.strftime('%b %d, %Y')}",
        },
        "stats": {
            "completed":          len(this_week_done),
            "total":              this_week_total,
            "completion_rate":    completion_rate_pct,
            "prev_rate":          prev_rate_pct,
            "delta_pct":          delta_pct,
            "focus_sessions":     focus_sessions,
            "focus_minutes":      focus_minutes,
            "xp_earned":          xp_this_week,
            "current_streak":     streak,
            "badges_earned":      len(badges_this_week),
        },
        "best_day":         best_day_label,
        "best_day_count":   best_day_count,
        "daily_breakdown":  daily_breakdown,
        "priority_counts":  dict(priority_counts),
        "badges_this_week": badges_this_week,
        "ai": {
            "headline":    headline,
            "narrative":   narrative,
            "suggestions": suggestions,
        },
    }
