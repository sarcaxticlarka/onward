"""JWT issuing/verification and password hashing.

When Supabase is configured, /auth routes delegate token issuance to
Supabase Auth itself and this module is used only to verify the JWT
(using SUPABASE_JWT_SECRET) on protected routes. When Supabase is not
configured, this module issues and verifies its own local JWTs so the
app keeps working end-to-end without external credentials.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings

settings = get_settings()
bearer_scheme = HTTPBearer(auto_error=False)

LOCAL_JWT_SECRET = (
    settings.SUPABASE_JWT_SECRET
    or os.environ.get("JWT_SECRET_KEY")
    or "local-dev-insecure-secret-change-me"
)


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or os.urandom(16).hex()
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest_hex = stored.split("$")
    except (ValueError, AttributeError):
        return False
    test = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 100_000)
    return hmac.compare_digest(test.hex(), digest_hex)


def create_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, LOCAL_JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, LOCAL_JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, LOCAL_JWT_SECRET, algorithms=[settings.JWT_ALGORITHM], options={"verify_aud": False})
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


class CurrentUser:
    def __init__(self, id: str, email: Optional[str] = None):
        self.id = id
        self.email = email


def _decode_supabase_token(token: str) -> Dict[str, Any]:
    """Verify a Supabase-issued JWT using SUPABASE_JWT_SECRET."""
    try:
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        # Some Supabase configs don't set aud=authenticated; retry without aud check.
        try:
            return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        except jwt.PyJWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Supabase token")


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> CurrentUser:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    if settings.use_supabase and settings.SUPABASE_JWT_SECRET:
        payload = _decode_supabase_token(creds.credentials)
    else:
        payload = decode_token(creds.credentials)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return CurrentUser(id=user_id, email=payload.get("email"))
