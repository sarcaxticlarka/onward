# Last-Minute Life Saver (LMLS)

> **An agentic AI productivity companion** — turn panic into a plan.  
> Capture tasks in natural language or voice, let the AI decompose, prioritise, and schedule them, then watch a LangGraph agent manage your calendar, trigger crisis mode when things get dire, and gamify the whole process.

---

## Table of Contents

1. [Overview](#overview)
2. [Feature List](#feature-list)
3. [Architecture](#architecture)
4. [Use-Case Diagram](#use-case-diagram)
5. [Entity-Relationship Diagram](#entity-relationship-diagram)
6. [System Flow Diagram](#system-flow-diagram)
7. [Tech Stack](#tech-stack)
8. [Project Structure](#project-structure)
9. [API Reference](#api-reference)
10. [Database Schema](#database-schema)
11. [Getting Started](#getting-started)
12. [Environment Variables](#environment-variables)

---

## Overview

LMLS is a full-stack web application that combines a **React + TypeScript** frontend with a **FastAPI (async Python)** backend.  
The backend runs a **LangGraph ReAct agent loop** that reads your task list, checks your Google Calendar, and produces actionable plans — all streamed to the browser in real time via SSE or WebSocket.

---

## Feature List

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Natural Language Task Creation** | Type anything ("submit bio essay tomorrow at 5pm") — Groq parses title, deadline, priority, category automatically |
| 2 | **AI Task Decomposition** | One click explodes a task into 3-6 ordered subtasks with time estimates via Claude |
| 3 | **Priority Scoring Engine** | Composite score (0-100) from deadline proximity, user-set weight, and AI confidence |
| 4 | **LangGraph ReAct Agent** | 5-node graph (Planner → ToolSelector → ToolExecutor → Observer → Responder) streams thinking via SSE/WebSocket |
| 5 | **Google Calendar Integration** | OAuth2 connect, read events, create/update events, detect task-calendar conflicts, resolve with time shifts |
| 6 | **Crisis Mode** | Auto-triggers when 3+ overdue/critical tasks pile up — generates an hour-by-hour survival schedule |
| 7 | **Voice Task Input** | Record audio in the browser → Groq Whisper transcription → NL parse → task created |
| 8 | **Smart Task Templates** | Pick Research Paper / Coding Project / Exam Prep / Job Application / Presentation / Group Project → full subtask tree in one click |
| 9 | **Gamification** | XP ledger, four levels (Procrastinator → Planner → Achiever → Legend), badges (Early Bird, Streak Master, Crisis Survivor, Focus Master), live leaderboard |
| 10 | **Pomodoro Timer** | 25-min focus sessions linked to tasks, XP awarded on completion, badges at 1st and 10th session |
| 11 | **Peer Accountability Rooms** | Create/join rooms with a 6-letter code, live leaderboard ranked by tasks-completed-today + XP |
| 12 | **Analytics Dashboard** | Weekly AI narrative, completion-rate line chart, priority pie chart, GitHub-style activity heatmap, deadline-risk predictor |
| 13 | **Weekly Report Card** | AI headline + 2-sentence narrative + 3 suggestions, best day, XP earned, focus minutes |
| 14 | **Google OAuth Sign-In** | One-click sign-in, JWT issued on backend, stored in Zustand + localStorage |
| 15 | **Billing / Plans** | Free (5 tasks, 10 agent calls) / Focus / Crisis — stored in user preferences |
| 16 | **Offline-first Backend** | Falls back to local SQLite if no Supabase/Postgres credentials; LLM calls degrade gracefully to heuristics |
| 17 | **Profile Page** | Avatar, display name, timezone, member-since, quick nav |
| 18 | **Dark/urgency styling** | Cards turn red border when deadline < 24 h; Crisis header pulses |


---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (React + Vite)                      │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐  │
│  │ Tasks UI │  │ Agent UI │  │Analytics │  │ Rooms / Pomodoro   │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬───────────┘  │
│       │              │              │                  │             │
│  ┌────▼──────────────▼──────────────▼──────────────────▼──────────┐ │
│  │          Axios (api.ts) + React Query + Zustand stores         │ │
│  └─────────────────────────────┬───────────────────────────────────┘ │
└────────────────────────────────┼────────────────────────────────────┘
                                 │  HTTP / SSE / WebSocket
                    ┌────────────▼────────────────────────────────┐
                    │        FastAPI (Python 3.12, async)         │
                    │                                             │
                    │  /auth   /tasks  /agent  /calendar          │
                    │  /analytics  /gamification  /pomodoro       │
                    │  /rooms  /billing                           │
                    │                                             │
                    │  ┌──────────────────────────────────────┐  │
                    │  │     LangGraph ReAct Agent Loop       │  │
                    │  │  Planner→ToolSelector→ToolExecutor   │  │
                    │  │       →Observer→Responder            │  │
                    │  └──────────────┬───────────────────────┘  │
                    │                 │ tools                     │
                    │  ┌──────────────▼───────────────────────┐  │
                    │  │  LLM Router (Groq / Claude / GPT-4o) │  │
                    │  └──────────────────────────────────────┘  │
                    └────────────────────┬────────────────────────┘
                                         │
              ┌──────────────────────────┼─────────────────────────┐
              │                          │                          │
    ┌─────────▼──────────┐  ┌────────────▼──────────┐  ┌──────────▼──────┐
    │  Supabase Postgres  │  │  Neon (direct Postgres)│  │  SQLite (local) │
    │  + Row-Level Sec.   │  │  psycopg2 pool         │  │  auto fallback  │
    └─────────────────────┘  └───────────────────────┘  └─────────────────┘
```


---

## Use-Case Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        LMLS System                                         │
│                                                                            │
│  ┌──────────────┐                                                          │
│  │              │──── Register / Login (email+pw or Google OAuth) ────────►│
│  │              │                                                          │
│  │              │──── Create Task (natural language) ────────────────────►│
│  │              │──── Create Task (voice recording) ──────────────────────►│
│  │              │──── Apply Smart Template ───────────────────────────────►│
│  │              │──── View / Filter / Sort Tasks ────────────────────────►│
│  │              │──── Update Task Status (pending→in_progress→completed) ─►│
│  │   Student /  │──── Decompose Task into Subtasks ──────────────────────►│
│  │   User       │──── Start Pomodoro Focus Session ──────────────────────►│
│  │              │                                                          │
│  │              │──── Chat with AI Agent ────────────────────────────────►│
│  │              │──── Request Weekly Plan ────────────────────────────────►│
│  │              │──── Trigger / View Crisis Mode ─────────────────────────►│
│  │              │                                                          │
│  │              │──── Connect Google Calendar ────────────────────────────►│
│  │              │──── View Calendar Events ───────────────────────────────►│
│  │              │──── Detect & Resolve Conflicts ─────────────────────────►│
│  │              │                                                          │
│  │              │──── View Analytics Dashboard ───────────────────────────►│
│  │              │──── View Weekly Report Card ────────────────────────────►│
│  │              │──── View Deadline Risk Predictions ────────────────────►│
│  │              │──── View Activity Streak Heatmap ──────────────────────►│
│  │              │                                                          │
│  │              │──── Create Accountability Room ─────────────────────────►│
│  │              │──── Join Room with Code ────────────────────────────────►│
│  │              │──── View Live Leaderboard ──────────────────────────────►│
│  │              │──── Leave Room ─────────────────────────────────────────►│
│  │              │                                                          │
│  │              │──── View XP / Level / Badges ───────────────────────────►│
│  │              │──── View Global Leaderboard ────────────────────────────►│
│  │              │                                                          │
│  │              │──── Subscribe to Plan (Free/Focus/Crisis) ─────────────►│
│  │              │──── View Profile ───────────────────────────────────────►│
│  └──────────────┘                                                          │
│                                                                            │
│  ┌──────────────┐                                                          │
│  │  AI Agent    │──── Read Tasks & Calendar context ──────────────────────►│
│  │  (LangGraph) │──── Decompose / Prioritise / Schedule ─────────────────►│
│  │              │──── Detect Conflicts ───────────────────────────────────►│
│  │              │──── Award XP & Badges on task completion ──────────────►│
│  └──────────────┘                                                          │
│                                                                            │
│  ┌──────────────┐                                                          │
│  │  Google      │──── OAuth2 token exchange ──────────────────────────────►│
│  │  OAuth       │──── Calendar read/write ────────────────────────────────►│
│  └──────────────┘                                                          │
└────────────────────────────────────────────────────────────────────────────┘
```


---

## Entity-Relationship Diagram

```
┌─────────────┐       ┌────────────────────┐       ┌──────────────────┐
│   users     │       │      tasks         │       │    sessions      │
│─────────────│       │────────────────────│       │──────────────────│
│ id (PK)     │──┐    │ id (PK)            │       │ id (PK)          │
│ email       │  │    │ user_id (FK)───────┼──────►│ user_id (FK)     │
│ password_   │  └───►│ title              │       │ started_at       │
│  hash       │       │ description        │       │ ended_at         │
│ preferences │       │ deadline           │       │ mode             │
│ timezone    │       │ priority           │       │ ai_plan (JSON)   │
│ created_at  │       │ category           │       │ actions_taken    │
└─────────────┘       │ status             │       │ messages (JSON)  │
       │              │ parent_task_id(FK)─┼──┐    └──────────────────┘
       │              │  (self-ref)        │  │
       │              │ ai_score           │  │    ┌──────────────────┐
       │              │ raw_input          │  └───►│  tasks (subtask) │
       │              │ estimated_minutes  │       └──────────────────┘
       │              │ created_at         │
       │              │ updated_at         │    ┌──────────────────────┐
       │              │ completed_at       │    │   integrations       │
       │              │ deleted_at         │    │──────────────────────│
       │              └────────────────────┘    │ id (PK)              │
       │                                        │ user_id (FK) ────────┤
       ├──────────────────────────────────────► │ provider             │
       │                                        │ access_token         │
       │              ┌────────────────────┐    │ refresh_token        │
       │              │   xp_events        │    │ expires_at           │
       │              │────────────────────│    └──────────────────────┘
       ├─────────────►│ id (PK)            │
       │              │ user_id (FK)       │    ┌──────────────────────┐
       │              │ amount             │    │   notifications      │
       │              │ reason             │    │──────────────────────│
       │              │ created_at         │    │ id (PK)              │
       │              └────────────────────┘    │ user_id (FK) ────────┤
       │                                        │ task_id (FK)         │
       │              ┌────────────────────┐    │ type / message       │
       │              │   badges           │    │ escalation_level     │
       │              │────────────────────│    │ acknowledged         │
       ├─────────────►│ id (PK)            │    └──────────────────────┘
       │              │ user_id (FK)       │
       │              │ badge_key          │    ┌──────────────────────┐
       │              │ awarded_at         │    │  pomodoro_sessions   │
       │              └────────────────────┘    │──────────────────────│
       │                                        │ id (PK)              │
       │              ┌────────────────────┐    │ user_id (FK) ────────┤
       │              │   leaderboard      │    │ task_id (FK)         │
       │              │────────────────────│    │ duration_minutes     │
       ├─────────────►│ user_id (PK/FK)    │    │ completed            │
       │              │ display_name       │    │ started_at           │
       │              │ total_xp           │    │ ended_at             │
       │              │ week_xp            │    └──────────────────────┘
       │              │ week_start         │
       │              └────────────────────┘    ┌──────────────────────┐
       │                                        │      rooms           │
       │              ┌────────────────────┐    │──────────────────────│
       │              │  refresh_tokens    │    │ id (PK)              │
       │              │────────────────────│    │ code (UNIQUE)        │
       ├─────────────►│ token (PK)         │    │ name                 │
       │              │ user_id (FK)       │    │ owner_id (FK) ───────┤
       │              │ created_at         │    │ created_at           │
       │              │ revoked            │    └──────┬───────────────┘
       │              └────────────────────┘           │
       │                                               │
       │              ┌────────────────────┐    ┌──────▼───────────────┐
       │              │      habits        │    │   room_members       │
       │              │────────────────────│    │──────────────────────│
       ├─────────────►│ id (PK)            │    │ id (PK)              │
                      │ user_id (FK)       │    │ room_id (FK)         │
                      │ pattern (JSON)     │    │ user_id (FK) ────────┘
                      │ accuracy_score     │    │ joined_at            │
                      │ updated_at         │    └──────────────────────┘
                      └────────────────────┘
```


---

## System Flow Diagram

```
User types "submit thesis by Friday 11pm"
            │
            ▼
     POST /tasks  {raw_input}
            │
            ▼
   task_parser.parse_natural_language_task()
     ├── Groq (fast) → JSON {title, deadline, priority, category}
     └── fallback heuristic if no API key
            │
            ▼
   compute_priority_score(deadline, user_weight, ai_confidence)
     → score 0-100
            │
            ▼
   db.insert("tasks", {...})
            │
            ▼
   gamification.on_task_created() → +5 XP
            │
            ▼
   TaskResponse returned to browser
   React Query cache invalidated → TaskList re-renders

─────────────────────────────────────────────────────────

User clicks "decompose" on a task
            │
            ▼
    POST /tasks/{id}/decompose
            │
            ▼
   task_parser.decompose_task(title, description, deadline)
     ├── Claude (reasoning) → {"subtasks": [...]}
     └── fallback: [Plan, Work, Review] × 3
            │
            ▼
   N subtasks inserted with parent_task_id
            │
            ▼
   DecomposeResponse → SubtaskTree renders in TaskCard

─────────────────────────────────────────────────────────

User opens Agent chat, sends message
            │
            ▼
    POST /agent/chat  (SSE stream)
            │
            ▼
   ┌────────────────────────────────────┐
   │       LangGraph ReAct Loop         │
   │                                    │
   │  Planner ──► ToolSelector          │
   │      │            │                │
   │      │      tool_name + args       │
   │      │            │                │
   │      │       ToolExecutor ──────── │──► calendar_read
   │      │            │                │──► task_decompose
   │      │        raw result           │──► conflict_detect
   │      │            │                │──► task_prioritize
   │      │         Observer            │──► send_notification
   │      │            │                │
   │      └──── needs_more? ────────────┘
   │                   │ no
   │               Responder
   │           final_response string
   └────────────────────────────────────┘
            │
      SSE events streamed:
       event: status  → "Reading your tasks..."
       event: tool    → {tool_name, result}
       event: final   → {response, plan, session_id}
            │
            ▼
   ChatPanel renders message bubbles in real time

─────────────────────────────────────────────────────────

3+ overdue/critical tasks detected
            │
            ▼
    POST /agent/crisis  {force: false}
            │
            ▼
   crisis.find_crisis_tasks() → crisis_tasks[]
   crisis.build_battle_plan() → hour_by_hour[], deprioritized[]
   gamification.on_crisis_survived() → +50 XP + badge
            │
            ▼
   CrisisPage renders:
     • Live countdown timers per task
     • Hour-by-hour schedule
     • Deprioritized tasks sidebar
     • Pulsing red header
```


---

## Tech Stack

### Frontend
| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 8 |
| State | Zustand (auth, tasks, agent) |
| Data fetching | TanStack React Query v5 |
| Routing | React Router v6 |
| HTTP client | Axios |
| Charts | Recharts |
| Icons | Lucide React |
| Linting | Oxlint |

### Backend
| Layer | Choice |
|---|---|
| Framework | FastAPI 0.115 (async) |
| Server | Uvicorn + Starlette |
| Auth | PyJWT (HS256), Supabase Auth passthrough |
| Agent | LangGraph 0.2, LangChain Core |
| LLM routing | Groq (Llama 3 / Whisper), Anthropic Claude, OpenAI GPT-4o |
| Primary DB | Supabase (Postgres + RLS) or Neon (direct Postgres) |
| Fallback DB | SQLite (auto-created, no config needed) |
| Calendar | Google Calendar API v3 via google-api-python-client |
| Background | Celery + Redis (configured, optional) |
| Validation | Pydantic v2 |

---

## Project Structure

```
last_minute_life_saver/
├── README.md                   ← this file
├── .gitignore
│
├── backend/
│   ├── .env                    ← secrets (gitignored)
│   ├── .env.example
│   ├── requirements.txt
│   ├── migrations/
│   │   └── 001_init.sql        ← Supabase Postgres schema
│   └── app/
│       ├── main.py             ← FastAPI app, CORS, router registration
│       ├── core/
│       │   ├── config.py       ← pydantic-settings env config
│       │   ├── db.py           ← Database facade (Supabase / Neon / SQLite)
│       │   └── security.py     ← JWT issue/verify, get_current_user
│       ├── models/
│       │   └── schemas.py      ← All Pydantic v2 request/response models
│       ├── services/
│       │   ├── llm_router.py   ← Route to Groq / Claude / GPT-4o
│       │   ├── task_parser.py  ← NL parse, decompose, priority score
│       │   ├── calendar_service.py ← Google Calendar OAuth + CRUD
│       │   ├── analytics.py    ← Completion rate, heatmap, AI summary
│       │   ├── gamification.py ← XP, levels, badges, streaks, leaderboard
│       │   └── notifications.py← Escalating alert logic
│       ├── agent/
│       │   ├── graph.py        ← LangGraph ReAct loop (5 nodes)
│       │   ├── tools.py        ← calendar_read/write, decompose, conflict, prioritize
│       │   └── crisis.py       ← Crisis detection + battle plan generation
│       └── api/
│           ├── auth.py         ← register, login, refresh, logout, Google OAuth
│           ├── tasks.py        ← CRUD, NL create, voice, templates, decompose
│           ├── agent.py        ← /chat (SSE), /ws, /plan, /crisis, /sessions
│           ├── calendar.py     ← auth, events, conflicts, resolve
│           ├── analytics.py    ← summary, completion-rate, heatmap, streak, risk, weekly-report
│           ├── gamification.py ← profile, leaderboard
│           ├── pomodoro.py     ← start, complete, stats
│           ├── rooms.py        ← create, join, mine, get, leave
│           └── billing.py      ← subscribe, status
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── .env                    ← VITE_API_URL etc.
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── types/index.ts      ← Task, User, CalendarEvent etc.
        ├── routes/index.tsx    ← React Router config
        ├── stores/             ← Zustand: authStore, taskStore, agentStore
        ├── hooks/              ← useAuth, useTasks, useAnalytics, useAgentChat
        ├── lib/
        │   ├── api.ts          ← Axios instance with JWT interceptor
        │   └── utils.ts        ← formatDeadline, isUrgent, timeUntil
        ├── pages/
        │   ├── LandingPage.tsx
        │   ├── LoginPage.tsx
        │   ├── RegisterPage.tsx
        │   ├── DashboardPage.tsx
        │   ├── TasksPage.tsx
        │   ├── AgentPage.tsx
        │   ├── AnalyticsPage.tsx
        │   ├── CrisisPage.tsx
        │   ├── RoomsPage.tsx
        │   ├── WeeklyReportPage.tsx
        │   ├── ProfilePage.tsx
        │   ├── GoogleCallbackPage.tsx
        │   └── CalendarConnectedPage.tsx
        └── components/
            ├── layout/         ← AppShell, Sidebar, ProtectedRoute
            ├── tasks/          ← TaskList, TaskCard, AddTaskModal, SubtaskTree,
            │                     TemplateModal, VoiceTaskInput
            ├── agent/          ← ChatPanel, ChatMessageBubble, VoiceInputButton
            ├── analytics/      ← CompletionChart, PriorityPieChart, StreakHeatmap
            ├── pomodoro/       ← PomodoroTimer
            ├── brand/          ← PortfolioSidebar, BrandMarks
            └── ui/             ← Toast, Skeleton, ErrorBoundary
```


---

## API Reference

### Auth — `/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | ✗ | Register with email + password |
| POST | `/auth/login` | ✗ | Login → access + refresh tokens |
| POST | `/auth/refresh` | ✗ | Rotate access token using refresh token |
| POST | `/auth/logout` | ✗ | Revoke refresh token |
| GET | `/auth/google` | ✗ | Redirect to Google consent screen |
| GET | `/auth/google/callback` | ✗ | Exchange code → JWT, redirect to `/auth/google/success` |

### Tasks — `/tasks`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tasks` | ✓ | List tasks (filter by status, priority) |
| POST | `/tasks` | ✓ | Create task from natural-language `raw_input` |
| GET | `/tasks/templates` | ✗ | List 6 smart templates (no auth needed) |
| POST | `/tasks/from-template` | ✓ | Create parent + full subtask tree from template |
| POST | `/tasks/voice` | ✓ | Upload audio → Whisper → NL parse → task |
| GET | `/tasks/{id}` | ✓ | Get single task |
| PATCH | `/tasks/{id}` | ✓ | Update title / deadline / priority / status |
| DELETE | `/tasks/{id}` | ✓ | Soft delete (sets `deleted_at`) |
| POST | `/tasks/{id}/decompose` | ✓ | AI-decompose into subtasks |
| GET | `/tasks/{id}/subtasks` | ✓ | List subtasks of a parent |

### Agent — `/agent`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/agent/chat` | ✓ | SSE stream: agent reads tasks+calendar, responds |
| WS | `/agent/ws` | token msg | WebSocket: same as above, real-time |
| POST | `/agent/plan` | ✓ | Generate N-day schedule plan |
| POST | `/agent/crisis` | ✓ | Trigger crisis mode, get hour-by-hour battle plan |
| GET | `/agent/sessions` | ✓ | List past agent sessions |
| GET | `/agent/sessions/{id}` | ✓ | Get single session |

### Calendar — `/calendar`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/calendar/status` | ✓ | Is Google Calendar connected? |
| GET | `/calendar/auth` | ✓ | Get OAuth consent URL |
| GET | `/calendar/callback` | ✗ | OAuth callback — stores tokens |
| GET | `/calendar/events` | ✓ | List events (next N days) |
| POST | `/calendar/events` | ✓ | Create calendar event |
| PATCH | `/calendar/events/{id}` | ✓ | Update calendar event |
| GET | `/calendar/conflicts` | ✓ | Detect task-calendar conflicts |
| POST | `/calendar/resolve` | ✓ | Shift event or task deadline to resolve conflict |

### Analytics — `/analytics`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/summary` | ✓ | AI-generated weekly narrative |
| GET | `/analytics/completion-rate` | ✓ | Completion % over time (day/week/month) |
| GET | `/analytics/focus-heatmap` | ✓ | Hour-of-day focus intensity grid |
| GET | `/analytics/streak` | ✓ | 365-day GitHub-style heatmap + streak stats |
| GET | `/analytics/deadline-risk` | ✓ | Risk scores for active tasks based on history |
| GET | `/analytics/weekly-report` | ✓ | Full weekly report card with AI headline + suggestions |

### Gamification — `/gamification`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/gamification/profile` | ✓ | XP, level, badges, streak |
| GET | `/gamification/leaderboard` | ✓ | Weekly XP leaderboard |

### Pomodoro — `/pomodoro`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/pomodoro/start` | ✓ | Start a focus session (linked to optional task) |
| POST | `/pomodoro/complete` | ✓ | Mark complete/abandoned → award XP |
| GET | `/pomodoro/stats` | ✓ | Total sessions, minutes, hours |
| GET | `/pomodoro/task/{id}` | ✓ | Pomodoro stats for a specific task |

### Rooms — `/rooms`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/rooms` | ✓ | Create accountability room (auto-joins creator) |
| POST | `/rooms/join` | ✓ | Join room by 6-letter code |
| GET | `/rooms/mine` | ✓ | List rooms you're a member of |
| GET | `/rooms/{code}` | ✓ | Room detail + live leaderboard |
| DELETE | `/rooms/{code}/leave` | ✓ | Leave room (deletes room if last member) |

### Billing — `/billing`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/billing/subscribe` | ✓ | Set plan (free / focus / crisis) |
| GET | `/billing/status` | ✓ | Current plan + limits |


---

## Database Schema

All tables are created automatically on first boot (SQLite fallback) or via `migrations/001_init.sql` (Supabase/Postgres).

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Account data | id, email, password_hash, preferences (JSON), timezone |
| `tasks` | Tasks + subtasks | id, user_id, title, deadline, priority, status, parent_task_id, ai_score, estimated_minutes |
| `sessions` | AI agent sessions | id, user_id, mode, ai_plan, actions_taken, messages |
| `habits` | Learned patterns | id, user_id, pattern (JSON), accuracy_score |
| `notifications` | Alerts | id, user_id, task_id, escalation_level (subtle/urgent/crisis) |
| `integrations` | OAuth tokens | id, user_id, provider, access_token, refresh_token, expires_at |
| `xp_events` | XP ledger | id, user_id, amount, reason |
| `badges` | Awarded badges | id, user_id, badge_key, awarded_at |
| `leaderboard` | Aggregated XP | user_id (PK), total_xp, week_xp, week_start |
| `refresh_tokens` | JWT rotation | token (PK), user_id, revoked |
| `pomodoro_sessions` | Focus sessions | id, user_id, task_id, duration_minutes, completed |
| `rooms` | Peer rooms | id, code (UNIQUE), name, owner_id |
| `room_members` | Room membership | id, room_id, user_id |

### Priority values: `low` · `medium` · `high` · `critical`  
### Status values: `pending` · `in_progress` · `completed` · `overdue`  
### Escalation values: `subtle` · `urgent` · `crisis`

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) Supabase project or Neon Postgres DB
- (Optional) Google Cloud Console project with OAuth2 credentials

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # fill in your keys
uvicorn app.main:app --reload --port 8000
```

Swagger UI → http://localhost:8000/docs  
OpenAPI JSON → http://localhost:8000/openapi.json

> **Zero-config mode**: leave `.env` empty. The app boots with a local SQLite DB (`lmls_local.db`) and degrades LLM calls to heuristics.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env              # set VITE_API_URL=http://localhost:8000
npm run dev
```

Open → http://localhost:5173

### Database migration (Supabase)

```bash
# Apply via Supabase SQL editor, or:
supabase db push --db-url "$SUPABASE_DB_URL"
# SQL file: backend/migrations/001_init.sql
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Recommended | Neon/Postgres DSN — `postgresql://user:pass@host/db?sslmode=require` |
| `SUPABASE_URL` | Optional | Supabase project URL (alternative to DATABASE_URL) |
| `SUPABASE_KEY` | Optional | Supabase service/anon key |
| `SUPABASE_JWT_SECRET` | Optional | Verify Supabase-issued JWTs |
| `GROQ_API_KEY` | Recommended | Fast inference: deadline parsing, voice transcription (Whisper) |
| `ANTHROPIC_API_KEY` | Optional | Claude: complex decomposition + planning |
| `OPENAI_API_KEY` | Optional | GPT-4o fallback |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth2 (login + calendar) |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth2 |
| `GOOGLE_REDIRECT_URI` | Optional | Calendar OAuth callback, default `http://localhost:8000/calendar/callback` |
| `REDIS_URL` | Optional | Celery/cache backend |
| `JWT_ALGORITHM` | HS256 | Local JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 30 | Refresh token lifetime |
| `SQLITE_PATH` | lmls_local.db | Local DB path (zero-config mode) |

### Frontend (`frontend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL |

---

## Gamification Reference

| Level | XP required |
|---|---|
| Procrastinator | 0 |
| Planner | 100 |
| Achiever | 400 |
| Legend | 1000 |

| Badge | Trigger |
|---|---|
| `early_bird` | Complete 5 tasks before their deadline |
| `streak_master` | 7-day consecutive completion streak |
| `crisis_survivor` | Survive a Crisis Mode session |
| `first_pomodoro` | Complete your first Pomodoro session |
| `focus_master` | Complete 10 Pomodoro sessions |
| `streak_7` | 7-day streak (analytics endpoint) |
| `streak_30` | 30-day streak |

| Action | XP |
|---|---|
| Task completed (after deadline) | +10 |
| Task completed (before deadline) | +35 |
| Crisis Mode survived | +50 |
| Pomodoro session completed | +15 |
| Pomodoro partial (≥10 min) | +5 |

---

## License

MIT — built for students, freelancers, and anyone running on deadline adrenaline.
