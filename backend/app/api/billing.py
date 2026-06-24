"""Billing endpoints — showcase/test mode (no real payment processor)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.db import Database, get_db, utcnow_iso
from app.core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])

PLAN_LIMITS = {
    "free":   {"task_limit": 5,  "agent_calls": 10},
    "focus":  {"task_limit": -1, "agent_calls": 100},
    "crisis": {"task_limit": -1, "agent_calls": -1},
}

class SubscribeRequest(BaseModel):
    plan: str

@router.post("/subscribe")
async def subscribe(
    payload: SubscribeRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    plan = payload.plan.lower()
    if plan not in PLAN_LIMITS:
        plan = "focus"
    limits = PLAN_LIMITS[plan]
    # Store plan in user preferences
    rows = db.list("users", {"id": user.id})
    if rows:
        prefs = rows[0].get("preferences") or {}
        prefs["plan"] = plan
        prefs["plan_activated_at"] = utcnow_iso()
        prefs.update(limits)
        db.update("users", user.id, {"preferences": prefs})
    return {"success": True, "plan": plan, "limits": limits}

@router.get("/status")
async def billing_status(
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    rows = db.list("users", {"id": user.id})
    prefs = (rows[0].get("preferences") or {}) if rows else {}
    plan = prefs.get("plan", "free")
    return {
        "plan": plan,
        "activated_at": prefs.get("plan_activated_at"),
        "limits": PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]),
    }
