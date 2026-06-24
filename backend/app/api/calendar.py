"""Calendar endpoints: Google OAuth flow, events CRUD, conflict detection/resolution."""
from __future__ import annotations

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from app.core.db import Database, get_db
from app.core.security import CurrentUser, decode_token, get_current_user
from app.models.schemas import (
    CalendarEventCreate,
    CalendarEventResponse,
    CalendarEventUpdate,
    ConflictItem,
    ResolveConflictRequest,
)
from app.services import calendar_service

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/auth")
async def calendar_auth(user: CurrentUser = Depends(get_current_user)):
    """Start the Google OAuth2 flow for calendar access. Returns the consent URL
    (state encodes the authenticated user id so the callback can attribute tokens)."""
    state = user.id
    try:
        url = calendar_service.build_auth_url(state)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return {"auth_url": url}


@router.get("/callback")
async def calendar_callback(code: str, state: str, db: Database = Depends(get_db)):
    """Google redirects here after consent. `state` carries the user id."""
    try:
        token_data = await calendar_service.exchange_code_for_tokens(code)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"OAuth exchange failed: {exc}")
    calendar_service.store_tokens(db, user_id=state, token_data=token_data)
    return {"success": True, "message": "Google Calendar connected."}


@router.get("/events", response_model=List[CalendarEventResponse])
async def get_events(
    days: int = Query(7, ge=1, le=60),
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    events = await calendar_service.list_events(db, user.id, days=days)
    return [CalendarEventResponse(**e) for e in events]


@router.post("/events", response_model=CalendarEventResponse, status_code=201)
async def create_event(
    payload: CalendarEventCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    try:
        event = await calendar_service.create_event(
            db, user.id, payload.title, payload.start.isoformat(), payload.end.isoformat(), payload.description
        )
    except calendar_service.CalendarNotConnectedError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return CalendarEventResponse(**event)


@router.patch("/events/{event_id}", response_model=CalendarEventResponse)
async def update_event(
    event_id: str,
    payload: CalendarEventUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    fields = payload.model_dump(exclude_unset=True)
    if "start" in fields and fields["start"] is not None:
        fields["start"] = fields["start"].isoformat()
    if "end" in fields and fields["end"] is not None:
        fields["end"] = fields["end"].isoformat()
    try:
        event = await calendar_service.update_event(db, user.id, event_id, fields)
    except calendar_service.CalendarNotConnectedError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    return CalendarEventResponse(**event)


@router.get("/conflicts", response_model=List[ConflictItem])
async def get_conflicts(
    days: int = Query(7, ge=1, le=60),
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    tasks = [t for t in db.list("tasks", {"user_id": user.id}) if not t.get("deleted_at") and t.get("status") != "completed"]
    events = await calendar_service.list_events(db, user.id, days=days)
    conflicts = calendar_service.detect_conflicts(tasks, events)
    return [ConflictItem(**c) for c in conflicts]


@router.post("/resolve")
async def resolve_conflict(
    payload: ResolveConflictRequest,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Apply an AI-suggested time shift to resolve a conflict. Shifts the
    calendar event (if event_id given) or the task deadline (if task_id given)."""
    if payload.event_id:
        events = await calendar_service.list_events(db, user.id, days=60)
        event = next((e for e in events if e["id"] == payload.event_id), None)
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        from datetime import datetime, timedelta

        start = datetime.fromisoformat(event["start"].replace("Z", "+00:00")) + timedelta(minutes=payload.shift_minutes)
        end = datetime.fromisoformat(event["end"].replace("Z", "+00:00")) + timedelta(minutes=payload.shift_minutes)
        try:
            updated = await calendar_service.update_event(db, user.id, payload.event_id, {"start": start.isoformat(), "end": end.isoformat()})
        except calendar_service.CalendarNotConnectedError as exc:
            raise HTTPException(status_code=409, detail=str(exc))
        return {"resolved": True, "event": updated}

    if payload.task_id:
        task = db.get("tasks", payload.task_id)
        if not task or task.get("user_id") != user.id:
            raise HTTPException(status_code=404, detail="Task not found")
        from datetime import datetime, timedelta

        if not task.get("deadline"):
            raise HTTPException(status_code=400, detail="Task has no deadline to shift")
        new_deadline = datetime.fromisoformat(task["deadline"].replace("Z", "+00:00")) + timedelta(minutes=payload.shift_minutes)
        updated = db.update("tasks", payload.task_id, {"deadline": new_deadline.isoformat()})
        return {"resolved": True, "task": updated}

    raise HTTPException(status_code=400, detail="Must provide event_id or task_id")
