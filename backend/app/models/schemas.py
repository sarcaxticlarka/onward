"""Pydantic v2 request/response models for every endpoint."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: Optional[str] = None
    timezone: str = "UTC"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    overdue = "overdue"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TaskCreate(BaseModel):
    raw_input: str


class TaskCreateStructured(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: TaskPriority = TaskPriority.medium
    category: Optional[str] = None
    parent_task_id: Optional[str] = None
    estimated_minutes: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    category: Optional[str] = None
    status: Optional[TaskStatus] = None
    estimated_minutes: Optional[int] = None


class TaskResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    deadline: Optional[str] = None
    priority: str
    category: Optional[str] = None
    status: str
    parent_task_id: Optional[str] = None
    ai_score: float = 0
    raw_input: Optional[str] = None
    estimated_minutes: Optional[int] = None
    created_at: str
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None
    deleted_at: Optional[str] = None


class SubtaskItem(BaseModel):
    title: str
    estimated_minutes: Optional[int] = None
    order: int = 0


class DecomposeResponse(BaseModel):
    parent_task_id: str
    subtasks: List[TaskResponse]


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str


class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class AgentPlanRequest(BaseModel):
    window_days: int = 7
    goal: Optional[str] = None


class AgentPlanResponse(BaseModel):
    session_id: str
    plan: Dict[str, Any]


class CrisisRequest(BaseModel):
    force: bool = False


class CrisisResponse(BaseModel):
    session_id: str
    crisis: bool
    triggering_tasks: List[TaskResponse]
    battle_plan: Dict[str, Any]


class SessionResponse(BaseModel):
    id: str
    user_id: str
    started_at: str
    ended_at: Optional[str] = None
    mode: str
    ai_plan: Dict[str, Any]
    actions_taken: List[Any]
    messages: List[Any] = []


# ---------------------------------------------------------------------------
# Calendar
# ---------------------------------------------------------------------------

class CalendarEventCreate(BaseModel):
    title: str
    start: datetime
    end: datetime
    description: Optional[str] = None


class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    description: Optional[str] = None


class CalendarEventResponse(BaseModel):
    id: str
    title: str
    start: str
    end: str
    description: Optional[str] = None
    source: str = "google"


class ConflictItem(BaseModel):
    task_id: Optional[str] = None
    event_id: Optional[str] = None
    reason: str
    suggested_shift_minutes: Optional[int] = None


class ResolveConflictRequest(BaseModel):
    event_id: Optional[str] = None
    task_id: Optional[str] = None
    shift_minutes: int


# ---------------------------------------------------------------------------
# Analytics / Gamification
# ---------------------------------------------------------------------------

class SummaryResponse(BaseModel):
    summary: str
    period: str = "week"


class CompletionRateResponse(BaseModel):
    granularity: str
    data: List[Dict[str, Any]]


class HeatmapResponse(BaseModel):
    data: List[Dict[str, Any]]


class GamificationProfile(BaseModel):
    user_id: str
    xp: int
    level: str
    badges: List[str]
    streak_days: int


class LeaderboardEntry(BaseModel):
    user_id: str
    display_name: Optional[str] = None
    xp: int
    rank: int


class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]
