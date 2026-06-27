"""Task CRUD, natural-language creation, decomposition, priority scoring."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from app.core.db import Database, get_db, new_id, utcnow_iso
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


# ── Smart Templates ────────────────────────────────────────────────────────
# IMPORTANT: these static routes MUST be declared before /{task_id} wildcard

TEMPLATES = [
    {
        "id": "research_paper",
        "label": "Research Paper",
        "emoji": "📄",
        "description": "End-to-end academic paper workflow",
        "estimated_days": 7,
        "category": "academic",
        "subtasks": [
            {"title": "Define research question & thesis", "estimated_minutes": 60, "order": 0},
            {"title": "Find & review 10+ sources",          "estimated_minutes": 180, "order": 1},
            {"title": "Create outline & structure",          "estimated_minutes": 45,  "order": 2},
            {"title": "Write first draft",                   "estimated_minutes": 240, "order": 3},
            {"title": "Add citations & bibliography",        "estimated_minutes": 60,  "order": 4},
            {"title": "Revise & proofread",                  "estimated_minutes": 90,  "order": 5},
            {"title": "Final formatting & submission",       "estimated_minutes": 30,  "order": 6},
        ],
    },
    {
        "id": "coding_project",
        "label": "Coding Project",
        "emoji": "💻",
        "description": "Software feature from idea to deployment",
        "estimated_days": 5,
        "category": "technical",
        "subtasks": [
            {"title": "Define requirements & scope",        "estimated_minutes": 30,  "order": 0},
            {"title": "Set up repo & project structure",   "estimated_minutes": 30,  "order": 1},
            {"title": "Implement core feature",            "estimated_minutes": 180, "order": 2},
            {"title": "Write unit & integration tests",    "estimated_minutes": 90,  "order": 3},
            {"title": "Code review & address feedback",    "estimated_minutes": 60,  "order": 4},
            {"title": "Deploy & monitor",                  "estimated_minutes": 45,  "order": 5},
        ],
    },
    {
        "id": "exam_prep",
        "label": "Exam Preparation",
        "emoji": "📚",
        "description": "Structured study plan for any exam",
        "estimated_days": 7,
        "category": "academic",
        "subtasks": [
            {"title": "Review syllabus & exam format",      "estimated_minutes": 30,  "order": 0},
            {"title": "Compile notes & key concepts",       "estimated_minutes": 120, "order": 1},
            {"title": "Practice with past papers / MCQs",  "estimated_minutes": 180, "order": 2},
            {"title": "Identify & revisit weak areas",     "estimated_minutes": 120, "order": 3},
            {"title": "Full mock exam under timed conditions", "estimated_minutes": 180, "order": 4},
            {"title": "Rest, review flashcards, stay calm", "estimated_minutes": 60, "order": 5},
        ],
    },
    {
        "id": "job_application",
        "label": "Job Application",
        "emoji": "💼",
        "description": "Apply to a role end-to-end",
        "estimated_days": 3,
        "category": "career",
        "subtasks": [
            {"title": "Research company & role",            "estimated_minutes": 45,  "order": 0},
            {"title": "Tailor resume to job description",  "estimated_minutes": 60,  "order": 1},
            {"title": "Write cover letter",                 "estimated_minutes": 60,  "order": 2},
            {"title": "Submit application & track it",     "estimated_minutes": 15,  "order": 3},
            {"title": "Prepare for potential interview",   "estimated_minutes": 120, "order": 4},
            {"title": "Follow up if no response in 1 week", "estimated_minutes": 10, "order": 5},
        ],
    },
    {
        "id": "presentation",
        "label": "Presentation",
        "emoji": "🎤",
        "description": "Design and deliver a polished deck",
        "estimated_days": 3,
        "category": "communication",
        "subtasks": [
            {"title": "Define audience & key message",      "estimated_minutes": 20,  "order": 0},
            {"title": "Create slide outline",               "estimated_minutes": 30,  "order": 1},
            {"title": "Build slides with visuals",          "estimated_minutes": 120, "order": 2},
            {"title": "Write speaker notes",                "estimated_minutes": 30,  "order": 3},
            {"title": "Rehearse 2× (once solo, once aloud)", "estimated_minutes": 60, "order": 4},
            {"title": "Deliver & handle Q&A",              "estimated_minutes": 30,  "order": 5},
        ],
    },
    {
        "id": "group_project",
        "label": "Group Project",
        "emoji": "🤝",
        "description": "Collaborate on a team deliverable",
        "estimated_days": 10,
        "category": "collaboration",
        "subtasks": [
            {"title": "Kickoff meeting — define scope & roles", "estimated_minutes": 60, "order": 0},
            {"title": "Set shared timeline & communication channel", "estimated_minutes": 20, "order": 1},
            {"title": "Complete individual assigned sections", "estimated_minutes": 240, "order": 2},
            {"title": "Merge sections & resolve conflicts",  "estimated_minutes": 60,  "order": 3},
            {"title": "Group review & feedback round",       "estimated_minutes": 60,  "order": 4},
            {"title": "Final polish & submission",           "estimated_minutes": 45,  "order": 5},
        ],
    },
]


@router.get("/templates")
def list_templates():
    """Return available task templates (no auth needed for the list)."""
    return {"templates": [
        {k: v for k, v in t.items() if k != "subtasks"} | {"subtask_count": len(t["subtasks"])}
        for t in TEMPLATES
    ]}


class FromTemplateBody(BaseModel):
    template_id: str
    title: str
    deadline: Optional[str] = None
    priority: str = "medium"


@router.post("/from-template", status_code=status.HTTP_201_CREATED)
async def create_from_template(
    body: FromTemplateBody,
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Create a parent task + full subtask tree from a template."""
    tpl = next((t for t in TEMPLATES if t["id"] == body.template_id), None)
    if not tpl:
        raise HTTPException(status_code=404, detail=f"Unknown template: {body.template_id}")

    score = task_parser.compute_priority_score(
        body.deadline,
        user_weight=task_parser.PRIORITY_WEIGHTS.get(body.priority, 0.5),
    )

    parent = db.insert("tasks", {
        "id":          new_id(),
        "user_id":     user.id,
        "title":       body.title.strip(),
        "description": tpl["description"],
        "priority":    body.priority,
        "deadline":    body.deadline,
        "status":      "pending",
        "category":    tpl["category"],
        "ai_score":    score,
        "created_at":  utcnow_iso(),
    })
    gamification.on_task_created(db, user.id)

    subtasks = []
    for st in tpl["subtasks"]:
        row = db.insert("tasks", {
            "id":                new_id(),
            "user_id":           user.id,
            "parent_task_id":    parent["id"],
            "title":             st["title"],
            "priority":          body.priority,
            "deadline":          body.deadline,
            "status":            "pending",
            "category":          tpl["category"],
            "estimated_minutes": st["estimated_minutes"],
            "ai_score":          score * 0.8,
            "created_at":        utcnow_iso(),
        })
        subtasks.append(row)

    return {
        "parent":   _to_response(parent),
        "subtasks": [_to_response(s) for s in subtasks],
        "template": tpl["label"],
        "count":    len(subtasks),
    }


@router.post("/voice", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task_from_voice(
    audio: UploadFile = File(...),
    user: CurrentUser = Depends(get_current_user),
    db: Database = Depends(get_db),
):
    """Transcribe audio via Groq Whisper, parse it as a task, then create it."""
    from app.core.config import get_settings
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="Groq API key not configured")

    audio_bytes = await audio.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio file too large (max 25 MB)")

    # Transcribe with Groq Whisper
    from groq import AsyncGroq
    import io
    client = AsyncGroq(api_key=settings.GROQ_API_KEY)
    try:
        filename = audio.filename or "recording.webm"
        transcription = await client.audio.transcriptions.create(
            model="whisper-large-v3",
            file=(filename, io.BytesIO(audio_bytes), audio.content_type or "audio/webm"),
            response_format="text",
        )
        raw_text = str(transcription).strip()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")

    if not raw_text:
        raise HTTPException(status_code=422, detail="No speech detected in audio")

    parsed = await task_parser.parse_natural_language_task(raw_text)
    score = task_parser.compute_priority_score(
        parsed.get("deadline"),
        user_weight=task_parser.PRIORITY_WEIGHTS.get(parsed.get("priority", "medium"), 0.5),
    )
    row = db.insert("tasks", {
        "id": new_id(),
        "user_id": user.id,
        "title": parsed["title"],
        "description": parsed.get("description", f'Voice: "{raw_text}"'),
        "priority": parsed.get("priority", "medium"),
        "deadline": parsed.get("deadline"),
        "status": "pending",
        "category": parsed.get("category"),
        "ai_score": score,
        "created_at": utcnow_iso(),
    })
    gamification.on_task_created(db, user.id)
    return _to_response(row)


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
    # Use user-selected priority if provided, else fall back to AI-parsed
    final_priority = (payload.priority.value if payload.priority else None) or parsed.get("priority", "medium")
    weight = task_parser.PRIORITY_WEIGHTS.get(final_priority, 0.5)
    score = task_parser.compute_priority_score(parsed.get("deadline"), user_weight=weight, ai_confidence=0.6)
    row = db.insert("tasks", {
        "user_id": user.id,
        "title": parsed.get("title", payload.raw_input[:200]),
        "description": None,
        "deadline": parsed.get("deadline"),
        "priority": final_priority,
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
