"""Peer accountability rooms — create, join, leaderboard."""
from __future__ import annotations

import random
import string
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.db import Database, get_db, new_id, utcnow_iso
from app.core.security import CurrentUser, get_current_user

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _gen_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


# ── Schemas ────────────────────────────────────────────────────────────────

class CreateRoomBody(BaseModel):
    name: str

class JoinRoomBody(BaseModel):
    code: str


# ── Helpers ────────────────────────────────────────────────────────────────

def _member_stats(db: Database, user_id: str, user_row: dict) -> dict:
    """Compute leaderboard stats for one user."""
    tasks = [t for t in db.list("tasks", {"user_id": user_id}) if not t.get("deleted_at")]
    today = date.today().isoformat()

    completed_today = 0
    for t in tasks:
        if t.get("status") != "completed":
            continue
        raw = t.get("completed_at") or t.get("updated_at") or ""
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            if dt.date().isoformat() == today:
                completed_today += 1
        except (ValueError, TypeError):
            pass

    total_completed = sum(1 for t in tasks if t.get("status") == "completed")
    total_tasks     = len(tasks)

    # XP from xp_events
    xp_rows = db.list("xp_events", {"user_id": user_id})
    total_xp = sum(r.get("amount", 0) for r in xp_rows)

    # Current streak
    from collections import defaultdict
    from datetime import timedelta
    day_counts: dict[str, int] = defaultdict(int)
    for t in tasks:
        if t.get("status") != "completed":
            continue
        raw = t.get("completed_at") or t.get("updated_at") or ""
        try:
            dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
            day_counts[dt.date().isoformat()] += 1
        except (ValueError, TypeError):
            pass

    streak = 0
    check = date.today()
    while day_counts.get(check.isoformat(), 0) > 0:
        streak += 1
        check -= timedelta(days=1)

    return {
        "user_id":         user_id,
        "name":            user_row.get("full_name") or user_row.get("email", "Member"),
        "avatar":          user_row.get("avatar_url"),
        "completed_today": completed_today,
        "total_completed": total_completed,
        "total_tasks":     total_tasks,
        "total_xp":        total_xp,
        "current_streak":  streak,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
def create_room(body: CreateRoomBody, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    # Unique code
    for _ in range(10):
        code = _gen_code()
        existing = db.list("rooms", {"code": code})
        if not existing:
            break
    room = db.insert("rooms", {
        "id":         new_id(),
        "code":       code,
        "name":       body.name.strip()[:80],
        "owner_id":   user.id,
        "created_at": utcnow_iso(),
    })
    # Auto-join creator
    db.insert("room_members", {
        "id":        new_id(),
        "room_id":   room["id"],
        "user_id":   user.id,
        "joined_at": utcnow_iso(),
    })
    return {"room": room}


@router.post("/join")
def join_room(body: JoinRoomBody, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    code = body.code.strip().upper()
    rooms = db.list("rooms", {"code": code})
    if not rooms:
        raise HTTPException(status_code=404, detail="Room not found. Check the code and try again.")
    room = rooms[0]
    # Already a member?
    members = db.list("room_members", {"room_id": room["id"], "user_id": user.id})
    if members:
        return {"room": room, "already_member": True}
    db.insert("room_members", {
        "id":        new_id(),
        "room_id":   room["id"],
        "user_id":   user.id,
        "joined_at": utcnow_iso(),
    })
    return {"room": room, "already_member": False}


@router.get("/mine")
def my_rooms(user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    memberships = db.list("room_members", {"user_id": user.id})
    result = []
    for m in memberships:
        room = db.get("rooms", m["room_id"])
        if room:
            member_count = len(db.list("room_members", {"room_id": room["id"]}))
            result.append({**room, "member_count": member_count})
    return {"rooms": result}


@router.get("/{code}")
def get_room(code: str, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    rooms = db.list("rooms", {"code": code.upper()})
    if not rooms:
        raise HTTPException(status_code=404, detail="Room not found.")
    room = rooms[0]

    # Must be a member to see leaderboard
    memberships = db.list("room_members", {"room_id": room["id"]})
    member_ids  = [m["user_id"] for m in memberships]
    if user.id not in member_ids:
        raise HTTPException(status_code=403, detail="Join the room first to see the leaderboard.")

    # Build leaderboard
    leaderboard = []
    for uid in member_ids:
        u = db.get("users", uid)
        if u:
            leaderboard.append(_member_stats(db, uid, u))

    # Sort: completed_today desc, then total_xp desc
    leaderboard.sort(key=lambda r: (-r["completed_today"], -r["total_xp"]))
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1

    return {
        "room":        room,
        "leaderboard": leaderboard,
        "is_owner":    room["owner_id"] == user.id,
    }


@router.delete("/{code}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_room(code: str, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    rooms = db.list("rooms", {"code": code.upper()})
    if not rooms:
        raise HTTPException(status_code=404, detail="Room not found.")
    room = rooms[0]
    memberships = db.list("room_members", {"room_id": room["id"], "user_id": user.id})
    for m in memberships:
        db.delete("room_members", m["id"])
    # If owner leaves and no members remain, delete the room
    remaining = db.list("room_members", {"room_id": room["id"]})
    if not remaining:
        db.delete("rooms", room["id"])
