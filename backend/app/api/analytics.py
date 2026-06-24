"""Analytics endpoints: weekly summary, completion rate, focus heatmap."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.core.db import Database, get_db
from app.core.security import CurrentUser, get_current_user
from app.models.schemas import CompletionRateResponse, HeatmapResponse, SummaryResponse
from app.services import analytics

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
