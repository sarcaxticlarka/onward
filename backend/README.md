# Last-Minute Life Saver — Backend

Agentic AI productivity companion backend. FastAPI (async) + Supabase (Postgres/Auth) +
LangGraph ReAct agent loop + LLM Router (Groq / Claude / GPT-4o) + Google Calendar integration.

## Quick start

```bash
cd backend
source venv/bin/activate          # venv already created
pip install -r requirements.txt
cp .env.example .env              # fill in real keys (optional for local dev)
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for interactive Swagger UI, or
http://localhost:8000/openapi.json for the raw schema.

## Running without credentials

The app is designed to **boot and serve all routes even with an empty `.env`**:

- No `SUPABASE_URL`/`SUPABASE_KEY` → falls back to a local SQLite database
  (`lmls_local.db`, auto-created) behind the same `Database` interface used
  for Supabase, so auth/tasks/sessions/etc. all work locally.
- No LLM provider keys → `route_llm()` raises a clear `LLMProviderError`
  internally; task creation, decomposition, agent chat, and analytics summary
  all catch this and fall back to a deterministic heuristic instead of
  crashing.
- No Google OAuth credentials → `/calendar/auth` returns a 503 with a clear
  message; calendar reads return an empty list; calendar writes return a
  409 "not connected" instead of throwing.

Fill in `.env` to unlock full functionality — see the variable list below.

## Database migrations (Supabase)

SQL migration: `migrations/001_init.sql`. Creates `users`, `tasks`, `sessions`,
`habits`, `notifications`, `integrations`, plus gamification tables
(`xp_events`, `badges`, `leaderboard`), with RLS policies keyed on `auth.uid()`.

Apply via the Supabase SQL editor, or:

```bash
supabase db push --db-url "$SUPABASE_DB_URL"
```

## Project layout

```
app/
  main.py              FastAPI app, CORS, lifespan, router registration
  core/
    config.py          pydantic-settings env config
    db.py              Database facade: Supabase primary / SQLite fallback
    security.py         JWT issue/verify (local + Supabase HS256 tokens)
  models/
    schemas.py          Pydantic v2 request/response models
  services/
    llm_router.py        route_llm(task_type, messages) -> Groq/Claude/GPT-4o
    task_parser.py       NL task parsing, decomposition, priority scoring
    calendar_service.py  Google OAuth2 + Calendar API read/write/conflicts
    analytics.py         completion rate, focus heatmap, AI weekly summary
    gamification.py      XP, levels, badges, streaks, leaderboard
    notifications.py     escalating alert logic (subtle/urgent/crisis)
  agent/
    graph.py             LangGraph ReAct loop (Planner/ToolSelector/ToolExecutor/Observer/Responder)
    tools.py             calendar_read/write, task_decompose, conflict_detect, task_prioritize, send_notification
    crisis.py            Crisis Mode trigger + battle plan generation
  api/
    auth.py, tasks.py, agent.py, calendar.py, analytics.py, gamification.py
```

## Environment variables

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase service/anon key |
| `SUPABASE_JWT_SECRET` | Used to verify Supabase-issued JWTs on protected routes |
| `GROQ_API_KEY` | Groq (fast inference: deadline parsing, classification) |
| `ANTHROPIC_API_KEY` | Claude (complex reasoning: decomposition, planning, crisis) |
| `OPENAI_API_KEY` | GPT-4o (vision/voice tasks) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Calendar OAuth2 client |
| `GOOGLE_REDIRECT_URI` | OAuth2 redirect, defaults to `http://localhost:8000/calendar/callback` |
| `REDIS_URL` | Celery/cache backend (optional for the routes implemented so far) |

## API surface

See `project.md` section 6 for the full reference. All listed endpoints are
implemented and registered in `app/main.py`:

- `/auth/*` — register, login, refresh, logout
- `/tasks*` — CRUD, NL creation, decompose, subtasks
- `/agent/*` — chat (SSE), `/agent/ws` (WebSocket), plan, crisis, sessions
- `/calendar/*` — auth, callback, events CRUD, conflicts, resolve
- `/analytics/*` — summary, completion-rate, focus-heatmap
- `/gamification/*` — profile, leaderboard
