"""Auth endpoints: register, login, refresh, logout, Google OAuth."""
from __future__ import annotations

from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.db import Database, get_db, new_id, utcnow_iso
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
    CurrentUser,
)
from app.models.schemas import LoginRequest, LogoutRequest, RefreshRequest, RegisterRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_LOGIN_REDIRECT = "http://localhost:8000/auth/google/callback"


@router.get("/google")
async def google_login():
    """Redirect to Google OAuth consent screen for Sign-In."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_LOGIN_REDIRECT,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
async def google_callback(code: str, db: Database = Depends(get_db)):
    """Exchange Google code for user info, create/find user, issue JWT."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_LOGIN_REDIRECT,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google code")
        token_data = token_resp.json()

        # Fetch user info
        user_resp = await client.get(GOOGLE_USERINFO_URL, headers={
            "Authorization": f"Bearer {token_data['access_token']}"
        })
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info")
        guser = user_resp.json()

    email = guser.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="No email from Google")

    # Find or create user
    rows = db.list("users", {"email": email})
    if rows:
        user = rows[0]
    else:
        user_id = new_id()
        user = db.insert("users", {
            "id": user_id,
            "email": email,
            "password_hash": "",  # no password for Google users
            "display_name": guser.get("name", email.split("@")[0]),
            "timezone": "UTC",
            "preferences": {"google_id": guser.get("id"), "avatar": guser.get("picture")},
            "created_at": utcnow_iso(),
        })

    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    db.insert("refresh_tokens", {"token": refresh, "user_id": user["id"], "created_at": utcnow_iso(), "revoked": False})

    # Redirect to frontend with tokens in URL fragment
    frontend = f"http://localhost:5173/auth/google/success#access={access}&refresh={refresh}"
    return RedirectResponse(frontend)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: Database = Depends(get_db)):
    if db.is_supabase:
        try:
            res = db.client.auth.sign_up({"email": payload.email, "password": payload.password})
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=400, detail=f"Supabase sign-up failed: {exc}")
        if not res.user:
            raise HTTPException(status_code=400, detail="Registration failed")
        db.client.table("users").upsert({
            "id": res.user.id,
            "email": payload.email,
            "preferences": {"display_name": payload.display_name},
            "timezone": payload.timezone,
            "created_at": utcnow_iso(),
        }).execute()
        session = res.session
        if not session:
            login_res = db.client.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
            session = login_res.session
        return TokenResponse(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            user={"id": res.user.id, "email": payload.email},
        )

    existing = db.list("users", {"email": payload.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = db.insert("users", {
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "preferences": {"display_name": payload.display_name},
        "timezone": payload.timezone,
        "created_at": utcnow_iso(),
    })
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    db.insert("refresh_tokens", {"token": refresh, "user_id": user["id"], "created_at": utcnow_iso(), "revoked": False})
    return TokenResponse(access_token=access, refresh_token=refresh, user={"id": user["id"], "email": user["email"]})


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: Database = Depends(get_db)):
    if db.is_supabase:
        try:
            res = db.client.auth.sign_in_with_password({"email": payload.email, "password": payload.password})
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=401, detail=f"Login failed: {exc}")
        if not res.session:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        return TokenResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user={"id": res.user.id, "email": res.user.email},
        )

    rows = db.list("users", {"email": payload.email})
    if not rows or not verify_password(payload.password, rows[0].get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user = rows[0]
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    db.insert("refresh_tokens", {"token": refresh, "user_id": user["id"], "created_at": utcnow_iso(), "revoked": False})
    return TokenResponse(access_token=access, refresh_token=refresh, user={"id": user["id"], "email": user["email"]})


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token_endpoint(payload: RefreshRequest, db: Database = Depends(get_db)):
    if db.is_supabase:
        try:
            res = db.client.auth.refresh_session(payload.refresh_token)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(status_code=401, detail=f"Refresh failed: {exc}")
        if not res.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        return TokenResponse(
            access_token=res.session.access_token,
            refresh_token=res.session.refresh_token,
            user={"id": res.user.id, "email": res.user.email},
        )

    decoded = decode_token(payload.refresh_token)
    if decoded.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")
    stored = db.list("refresh_tokens", {"token": payload.refresh_token})
    if not stored or stored[0].get("revoked"):
        raise HTTPException(status_code=401, detail="Refresh token revoked or unknown")
    user_id = decoded["sub"]
    user = db.get("users", user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(user_id, user["email"])
    new_refresh = create_refresh_token(user_id)
    db.update("refresh_tokens", payload.refresh_token, {"revoked": True}, id_col="token")
    db.insert("refresh_tokens", {"token": new_refresh, "user_id": user_id, "created_at": utcnow_iso(), "revoked": False})
    return TokenResponse(access_token=access, refresh_token=new_refresh, user={"id": user_id, "email": user["email"]})


@router.post("/logout")
async def logout(payload: LogoutRequest, db: Database = Depends(get_db)):
    if db.is_supabase:
        try:
            db.client.auth.sign_out()
        except Exception:  # noqa: BLE001
            pass
        return {"success": True}

    db.update("refresh_tokens", payload.refresh_token, {"revoked": True}, id_col="token")
    return {"success": True}
