"""FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import agent, analytics, auth, calendar, gamification, tasks
from app.core.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Touch the DB layer at startup so the SQLite fallback schema is created
    # (and Supabase client is constructed) before the first request, while
    # never raising if external services/credentials are unavailable.
    from app.core.db import get_db

    try:
        get_db()
    except Exception as exc:  # noqa: BLE001
        print(f"[startup] Database initialization warning: {exc}")
    print(f"[startup] {settings.APP_NAME} ready. Supabase configured: {settings.use_supabase}")
    yield
    print("[shutdown] Bye.")


app = FastAPI(
    title=settings.APP_NAME,
    description="Agentic AI productivity companion backend — task management, "
    "LangGraph agent loop, Google Calendar integration, analytics & gamification.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(agent.router)
app.include_router(calendar.router)
app.include_router(analytics.router)
app.include_router(gamification.router)


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "status": "ok", "supabase_configured": settings.use_supabase}


@app.get("/health")
async def health():
    return {"status": "healthy"}
