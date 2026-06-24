"""Gamification endpoints: profile (XP/level/badges/streak), leaderboard."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.db import Database, get_db
from app.core.security import CurrentUser, get_current_user
from app.models.schemas import GamificationProfile, LeaderboardResponse
from app.services import gamification

router = APIRouter(prefix="/gamification", tags=["gamification"])


@router.get("/profile", response_model=GamificationProfile)
async def profile(user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    data = gamification.get_profile(db, user.id)
    return GamificationProfile(**data)


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def leaderboard(limit: int = Query(20, ge=1, le=100), db: Database = Depends(get_db)):
    entries = gamification.get_leaderboard(db, limit=limit)
    return LeaderboardResponse(entries=entries)
