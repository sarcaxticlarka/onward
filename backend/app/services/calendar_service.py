"""Google Calendar OAuth2 + read/write helpers.

Degrades gracefully: if GOOGLE_CLIENT_ID/SECRET are not configured, or the
user has no stored integration tokens, calendar reads return an empty list
and writes raise a clear error instead of crashing.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.core.db import Database, utcnow_iso

settings = get_settings()

GOOGLE_AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPES = ["https://www.googleapis.com/auth/calendar"]


class CalendarNotConnectedError(RuntimeError):
    pass


def build_auth_url(state: str) -> str:
    if not settings.GOOGLE_CLIENT_ID:
        raise RuntimeError("GOOGLE_CLIENT_ID is not configured.")
    from urllib.parse import urlencode

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_BASE}?{urlencode(params)}"


async def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    import httpx

    if not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        raise RuntimeError("Google OAuth client credentials not configured.")
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(GOOGLE_TOKEN_URL, data=data)
        resp.raise_for_status()
        return resp.json()


def store_tokens(db: Database, user_id: str, token_data: Dict[str, Any]) -> Dict[str, Any]:
    expires_in = token_data.get("expires_in", 3600)
    expires_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat()
    existing = [i for i in db.list("integrations", {"user_id": user_id}) if i.get("provider") == "google_calendar"]
    payload = {
        "user_id": user_id,
        "provider": "google_calendar",
        "access_token": token_data.get("access_token"),
        "refresh_token": token_data.get("refresh_token"),
        "expires_at": expires_at,
        "created_at": utcnow_iso(),
    }
    if existing:
        return db.update("integrations", existing[0]["id"], payload)
    return db.insert("integrations", payload)


def get_integration(db: Database, user_id: str) -> Optional[Dict[str, Any]]:
    rows = [i for i in db.list("integrations", {"user_id": user_id}) if i.get("provider") == "google_calendar"]
    return rows[0] if rows else None


def _get_credentials(integration: Dict[str, Any]):
    from google.oauth2.credentials import Credentials

    return Credentials(
        token=integration.get("access_token"),
        refresh_token=integration.get("refresh_token"),
        token_uri=GOOGLE_TOKEN_URL,
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        scopes=SCOPES,
    )


async def list_events(db: Database, user_id: str, days: int = 7) -> List[Dict[str, Any]]:
    integration = get_integration(db, user_id)
    if not integration or not settings.GOOGLE_CLIENT_ID:
        return []
    try:
        from googleapiclient.discovery import build

        creds = _get_credentials(integration)
        service = build("calendar", "v3", credentials=creds)
        now = datetime.now(timezone.utc)
        time_min = now.isoformat()
        time_max = (now + timedelta(days=days)).isoformat()
        events_result = service.events().list(
            calendarId="primary", timeMin=time_min, timeMax=time_max,
            singleEvents=True, orderBy="startTime",
        ).execute()
        items = events_result.get("items", [])
        return [
            {
                "id": e.get("id"),
                "title": e.get("summary", "(no title)"),
                "start": e.get("start", {}).get("dateTime") or e.get("start", {}).get("date"),
                "end": e.get("end", {}).get("dateTime") or e.get("end", {}).get("date"),
                "description": e.get("description"),
                "source": "google",
            }
            for e in items
        ]
    except Exception:  # noqa: BLE001
        return []


async def create_event(db: Database, user_id: str, title: str, start: str, end: str, description: Optional[str] = None) -> Dict[str, Any]:
    integration = get_integration(db, user_id)
    if not integration or not settings.GOOGLE_CLIENT_ID:
        raise CalendarNotConnectedError("Google Calendar is not connected for this user.")
    from googleapiclient.discovery import build

    creds = _get_credentials(integration)
    service = build("calendar", "v3", credentials=creds)
    body = {
        "summary": title,
        "description": description,
        "start": {"dateTime": start},
        "end": {"dateTime": end},
    }
    created = service.events().insert(calendarId="primary", body=body).execute()
    return {
        "id": created.get("id"),
        "title": created.get("summary"),
        "start": created.get("start", {}).get("dateTime"),
        "end": created.get("end", {}).get("dateTime"),
        "description": created.get("description"),
        "source": "google",
    }


async def update_event(db: Database, user_id: str, event_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
    integration = get_integration(db, user_id)
    if not integration or not settings.GOOGLE_CLIENT_ID:
        raise CalendarNotConnectedError("Google Calendar is not connected for this user.")
    from googleapiclient.discovery import build

    creds = _get_credentials(integration)
    service = build("calendar", "v3", credentials=creds)
    body = {}
    if "title" in fields and fields["title"]:
        body["summary"] = fields["title"]
    if "description" in fields and fields["description"] is not None:
        body["description"] = fields["description"]
    if "start" in fields and fields["start"]:
        body["start"] = {"dateTime": fields["start"]}
    if "end" in fields and fields["end"]:
        body["end"] = {"dateTime": fields["end"]}
    updated = service.events().patch(calendarId="primary", eventId=event_id, body=body).execute()
    return {
        "id": updated.get("id"),
        "title": updated.get("summary"),
        "start": updated.get("start", {}).get("dateTime"),
        "end": updated.get("end", {}).get("dateTime"),
        "description": updated.get("description"),
        "source": "google",
    }


def detect_conflicts(tasks: List[Dict[str, Any]], events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Scan task deadlines vs calendar events for overlaps.

    A conflict is flagged when a task's deadline falls within (or close
    before) a busy calendar block, since the agent would not have free time
    to actually finish the task before its deadline.
    """
    conflicts = []
    for t in tasks:
        deadline = t.get("deadline")
        if not deadline:
            continue
        try:
            dl = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
            if dl.tzinfo is None:
                dl = dl.replace(tzinfo=timezone.utc)
        except (ValueError, TypeError):
            continue
        for e in events:
            try:
                start = datetime.fromisoformat(e["start"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(e["end"].replace("Z", "+00:00"))
                if start.tzinfo is None:
                    start = start.replace(tzinfo=timezone.utc)
                if end.tzinfo is None:
                    end = end.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError, KeyError):
                continue
            if start <= dl <= end:
                conflicts.append({
                    "task_id": t.get("id"),
                    "event_id": e.get("id"),
                    "reason": f"Task '{t.get('title')}' deadline falls inside event '{e.get('title')}'",
                    "suggested_shift_minutes": int((end - dl).total_seconds() / 60) + 30,
                })
    return conflicts
