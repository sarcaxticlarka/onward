"""Task CRUD, natural-language creation, decomposition, priority scoring."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.db import Database, get_db, utcnow_iso
from app.core.security import CurrentUser, get_current_user
from app.models.schemas import (
    DecomposeResponse,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from app.services import gamification, task_parser

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _to_response(row: dict) -> TaskResponse:
    return TaskResponse(**{
        **row,
        "deadline": row.get("deadline"),
        "created_at": row.get("created_at") or utcnow_iso(),
    })


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    filters = {"user_id": user.id}
    if status_filter:
        filters["status"] = status_filter
    if priority:
        filters["priority"] = priority
    rows = db.list("tasks", filters, order_by="-created_at")
    rows = [r for r in rows if not r.get("deleted_at")]
    return [_to_response(r) for r in rows]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    parsed = await task_parser.parse_natural_language_task(payload.raw_input)
    weight = task_parser.PRIORITY_WEIGHTS.get(parsed.get("priority", "medium"), 0.5)
    score = task_parser.compute_priority_score(parsed.get("deadline"), user_weight=weight, ai_confidence=0.6)
    row = db.insert("tasks", {
        "user_id": user.id,
        "title": parsed.get("title", payload.raw_input[:200]),
        "description": None,
        "deadline": parsed.get("deadline"),
        "priority": parsed.get("priority", "medium"),
        "category": parsed.get("category"),
        "status": "pending",
        "parent_task_id": None,
        "ai_score": score,
        "raw_input": payload.raw_input,
        "estimated_minutes": parsed.get("estimated_minutes"),
        "created_at": utcnow_iso(),
    })
    return _to_response(row)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    row = db.get("tasks", task_id)
    if not row or row.get("user_id") != user.id or row.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Task not found")
    return _to_response(row)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    row = db.get("tasks", task_id)
    if not row or row.get("user_id") != user.id or row.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Task not found")

    fields = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if "deadline" in fields and fields["deadline"] is not None:
        fields["deadline"] = fields["deadline"].isoformat() if isinstance(fields["deadline"], datetime) else fields["deadline"]
    if "priority" in fields and fields["priority"] is not None:
        fields["priority"] = fields["priority"].value if hasattr(fields["priority"], "value") else fields["priority"]
    if "status" in fields and fields["status"] is not None:
        fields["status"] = fields["status"].value if hasattr(fields["status"], "value") else fields["status"]
        if fields["status"] == "completed":
            fields["completed_at"] = utcnow_iso()

    fields["updated_at"] = utcnow_iso()

    if "deadline" in fields or "priority" in fields:
        new_deadline = fields.get("deadline", row.get("deadline"))
        new_priority = fields.get("priority", row.get("priority", "medium"))
        weight = task_parser.PRIORITY_WEIGHTS.get(new_priority, 0.5)
        fields["ai_score"] = task_parser.compute_priority_score(new_deadline, user_weight=weight, ai_confidence=0.6)

    updated = db.update("tasks", task_id, fields)

    if fields.get("status") == "completed" and row.get("status") != "completed":
        gamification.on_task_completed(db, user.id, updated)

    return _to_response(updated)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    row = db.get("tasks", task_id)
    if not row or row.get("user_id") != user.id or row.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Task not found")
    db.update("tasks", task_id, {"deleted_at": utcnow_iso()})
    return None


@router.post("/{task_id}/decompose", response_model=DecomposeResponse)
async def decompose(task_id: str, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    row = db.get("tasks", task_id)
    if not row or row.get("user_id") != user.id or row.get("deleted_at"):
        raise HTTPException(status_code=404, detail="Task not found")

    subtasks_raw = await task_parser.decompose_task(row["title"], row.get("description"), row.get("deadline"))
    created = []
    for s in subtasks_raw:
        sub = db.insert("tasks", {
            "user_id": user.id,
            "title": s.get("title", "subtask"),
            "description": None,
            "deadline": row.get("deadline"),
            "priority": row.get("priority", "medium"),
            "category": row.get("category"),
            "status": "pending",
            "parent_task_id": task_id,
            "ai_score": 0,
            "estimated_minutes": s.get("estimated_minutes"),
            "created_at": utcnow_iso(),
        })
        created.append(_to_response(sub))
    return DecomposeResponse(parent_task_id=task_id, subtasks=created)


@router.get("/{task_id}/subtasks", response_model=List[TaskResponse])
async def get_subtasks(task_id: str, user: CurrentUser = Depends(get_current_user), db: Database = Depends(get_db)):
    parent = db.get("tasks", task_id)
    if not parent or parent.get("user_id") != user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    rows = db.list("tasks", {"parent_task_id": task_id, "user_id": user.id})
    rows = [r for r in rows if not r.get("deleted_at")]
    return [_to_response(r) for r in rows]
