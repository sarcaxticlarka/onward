
HACKATHON BLUEPRINT
Last-Minute Life Saver
AI-Powered Productivity Companion


5 Phases
Delivery
Full Stack
Architecture
Agentic AI
Core Feature
Judge-Ready
Demo Strategy

1. Executive Summary
Last-Minute Life Saver is an agentic AI productivity companion that goes beyond passive reminders. It understands context, reasons about your schedule, and takes autonomous actions — creating calendar events, breaking tasks into subtasks, detecting conflicts, and proactively nudging you before deadlines are missed. It is designed to win hackathons by showing real AI doing real work.

Category
Value
Problem
Passive reminders fail. Users ignore them, miss deadlines, and feel overwhelmed.
Solution
An AI agent that plans FOR you — not just notifies you.
Core AI Angle
LLM-powered task decomposition, conflict resolution, and autonomous scheduling.
Tech Stack
React + FastAPI + Supabase + LLM Router (Groq/Claude/GPT-4o)
Hackathon Edge
Agentic execution, calendar integration, live demo with real data.

2. Problem Statement
Most productivity tools treat users as passive recipients of notifications. They fail at the moment it matters most — when users are overwhelmed and unable to self-organize. The gap is not in reminders, but in intelligent execution support.

Current Pain Points
What We Solve
Passive reminders easy to dismiss
Proactive AI that escalates urgency intelligently
No context awareness between tasks
Agent understands dependencies and sequences tasks
Calendar sync is one-way and dumb
Bidirectional: agent creates and rearranges events
No help when overwhelmed
Crisis mode: AI reprioritizes entire backlog in seconds
Fragmented tools (Notion, Gcal, Todo)
Unified interface with all integrations under one agent

3. System Architecture
The system is built as a three-tier architecture: a React frontend, a FastAPI backend orchestrating the AI agent, and Supabase as the persistent data layer. The AI layer routes intelligently across providers for cost-performance optimization.

3.1 Architecture Overview
Frontend Layer
Backend / Agent Layer
Data & Integration Layer
React 18 + Vite
Zustand state mgmt
React Query (server state)
GSAP animations
ShadCN/UI components
FastAPI (async)
LangGraph agent loop
LLM Router (Groq/Claude)
Tool executor module
WebSocket (real-time)
Supabase (PostgreSQL)
Supabase Auth (JWT)
Google Calendar MCP
Redis (job queue cache)
Celery (background tasks)

3.2 AI Agent Architecture
The agent follows a ReAct (Reason + Act) loop powered by LangGraph. Each user request enters the planning phase, where the LLM decides which tools to call, executes them sequentially, observes results, and produces a structured plan.

Agent Component
Responsibility
Planner Node
LLM reasons over user input + task list + calendar context to generate a structured plan
Tool Executor
Executes: calendar_read, calendar_write, task_decompose, conflict_detect, notify
Memory Module
Stores short-term context (active tasks) and long-term patterns (user habits via Supabase)
LLM Router
Routes to Groq (speed), Claude (reasoning), GPT-4o (vision/voice) based on task type
Feedback Loop
User accepts/rejects plan → agent updates preferences and improves future scheduling

3.3 Database Schema
Table
Key Columns
Purpose
users
id, email, preferences JSONB, timezone, created_at
Auth + user preference storage
tasks
id, user_id, title, deadline, priority, status, parent_task_id, ai_score
Core task model with self-referential subtasks
sessions
id, user_id, started_at, ai_plan JSONB, actions_taken JSONB
Tracks each AI planning session
habits
id, user_id, pattern JSONB, accuracy_score, updated_at
Learned productivity patterns per user
notifications
id, task_id, type, sent_at, acknowledged, escalation_level
Notification history and escalation state
integrations
id, user_id, provider, access_token, refresh_token, expires_at
OAuth tokens for Google Calendar etc.

4. Feature Specification
Features are organized into three tiers: Core MVP (must-ship for demo), Enhanced (ship if time allows), and Wow Factor (judge impression features).

4.1 Core MVP Features

📋
Intelligent Task Capture  [MUST SHIP]
Natural language input: 'Submit ML assignment by Friday 11pm'. Agent auto-extracts deadline, priority, and category.

🧠
AI Task Decomposition  [MUST SHIP]
LLM breaks any task into ordered subtasks with time estimates. 'Prepare for interview' → Research company, Update resume, Mock Q&A, Sleep early.

⚡
Conflict Detection & Resolution  [MUST SHIP]
Agent scans calendar, finds scheduling conflicts, and proposes resolutions autonomously. No manual effort.

📅
Autonomous Calendar Scheduling  [MUST SHIP]
Agent creates/updates Google Calendar events directly. Not a suggestion — it actually schedules.

🚨
Smart Escalating Alerts  [MUST SHIP]
Reminders escalate: subtle nudge → urgent push → crisis banner. Urgency scales with time-to-deadline.

4.2 Enhanced Features

🎯
Priority Scoring Engine  [HIGH]
AI assigns dynamic priority scores (0-100) combining deadline proximity, task weight, user patterns, and energy levels.

📊
Productivity Dashboard  [HIGH]
Visual heatmap of task completion, streak tracker, weekly summary generated by AI, and focus time analytics.

🔄
Habit Pattern Learning  [MEDIUM]
After 3+ sessions, agent infers when the user works best, which task types they delay, and adapts scheduling accordingly.

🎤
Voice Command Interface  [MEDIUM]
Web Speech API integration: 'Add task: finish presentation by tomorrow noon' — agent processes and schedules.

4.3 Wow Factor Features

🆘
Crisis Mode  [WOW]
When 3+ tasks are due in 24h, agent enters crisis mode: reprioritizes entire backlog, creates an emergency schedule, and sends a cohesive battle plan.

🤖
Agent Chat Interface  [WOW]
Full conversational UI: 'I have an exam and two assignments this week — plan my schedule'. Agent reasons and responds with an actionable plan.

🏆
Gamification Layer  [WOW]
XP points, streaks, badges (e.g., 'Early Bird' — completed 5 tasks before deadline). Leaderboard for friend groups.

5. Phase-Wise Development Plan
The project is structured into 5 phases aligned with a typical 24–48 hour hackathon timeline. Each phase has clear deliverables and a definition of done.

PHASE 1
Foundation & Project Setup

Metric
Value
Duration
2–3 hours
Goal
Runnable skeleton: auth works, DB connected, routes responding
Team Focus
1 person backend setup, 1 person frontend scaffold

Backend Setup
	•	Initialize FastAPI project with async support, CORS, and environment config
	•	Connect to Supabase: run migrations for users, tasks, sessions, habits tables
	•	Implement JWT auth endpoints: /register, /login, /refresh using Supabase Auth
	•	Set up LLM Router module — abstract interface for Groq/Claude/GPT-4o providers
	•	Configure Redis connection for task queue and caching
Frontend Setup
	•	Scaffold React 18 + Vite project with ShadCN/UI and Tailwind
	•	Set up Zustand stores: authStore, taskStore, agentStore
	•	Configure React Query with custom hooks for API calls
	•	Implement auth pages (Login/Register) with JWT token handling
	•	Set up routing (React Router v6): /dashboard, /tasks, /agent, /analytics
Phase 1 Definition of Done
	•	User can register and login
	•	Protected routes work with JWT
	•	Database tables created and seeded with test data
	•	LLM Router returns a response from at least one provider

PHASE 2
Core Task Engine

Metric
Value
Duration
4–6 hours
Goal
Users can create, view, update tasks; AI decomposition works end-to-end
Team Focus
Backend: task CRUD + AI decomposition API; Frontend: task UI

Task Management Backend
	•	Implement full Task CRUD: POST /tasks, GET /tasks, PATCH /tasks/{id}, DELETE /tasks/{id}
	•	Add priority scoring logic: combine deadline proximity, user-set weight, and AI confidence score
	•	Build task decomposition endpoint: POST /agent/decompose — calls LLM, returns subtask tree
	•	Implement deadline parsing: extract structured deadline from natural language using LLM
	•	Add task status state machine: pending → in_progress → completed / overdue
Task Management Frontend
	•	Build TaskCard component with priority badge, deadline countdown, and status toggle
	•	Implement TaskList view with filter/sort by priority, deadline, status, category
	•	Build AddTask modal with natural language input and AI-parsed preview
	•	Build SubtaskTree component: collapsible tree view of AI-generated subtasks
	•	Add real-time deadline countdown timers using useEffect intervals
AI Decomposition Flow
	•	User inputs: 'Build full-stack app by Sunday midnight'
	•	LLM extracts deadline: Sunday 11:59 PM
	•	LLM generates subtasks: Design DB schema (1h), Build API (3h), Build UI (4h), Deploy (1h), Test (1h)
	•	Agent auto-schedules each subtask into available calendar slots
	•	User sees full plan with editable time blocks

PHASE 3
AI Agent Core & Calendar Integration

Metric
Value
Duration
5–7 hours
Goal
Full agent loop working: conflict detection, autonomous scheduling, Google Calendar sync
Team Focus
Backend: agent loop + Google Calendar MCP; Frontend: agent chat UI

LangGraph Agent Loop
	•	Implement ReAct agent with nodes: Planner → ToolSelector → ToolExecutor → Observer → Responder
	•	Define tool schema for: calendar_read, calendar_write, conflict_detect, task_prioritize, send_notification
	•	Implement agent state: carries task list, calendar events, user preferences, conversation history
	•	Add sequential tool calling guard — agent must wait for each tool result before calling next
	•	Store each session (plan + actions) in sessions table for learning and auditability
Google Calendar Integration
	•	OAuth 2.0 flow: redirect user to Google consent, store tokens in integrations table
	•	Implement calendar_read tool: fetch events for next 7 days, parse into agent-readable format
	•	Implement calendar_write tool: create event, update event, delete event via Google Calendar API
	•	Build conflict detection: scan existing events + task deadlines, flag overlaps
	•	Implement autonomous resolution: agent suggests and can apply time shifts to resolve conflicts
Agent Chat UI
	•	Build Chat interface: message history, streaming response display, typing indicator
	•	Implement WebSocket connection to backend for real-time agent responses
	•	Show tool execution trace: user can see 'Checking your calendar... Found 2 conflicts... Resolving...'
	•	Add action confirmation panel: agent proposes actions, user can approve/reject each
	•	Voice input: Web Speech API integration with push-to-talk button

PHASE 4
Analytics, Gamification & Wow Features

Metric
Value
Duration
3–4 hours
Goal
Crisis Mode working, dashboard live, gamification visible for demo
Team Focus
Both: parallel — one on dashboard/analytics, one on Crisis Mode

Productivity Analytics Dashboard
	•	Task completion rate chart (daily/weekly) using Recharts LineChart
	•	Priority distribution pie chart: how many High/Medium/Low tasks
	•	Focus time heatmap: GitHub-style grid showing productive hours by day
	•	AI-generated weekly summary: LLM summarizes the week in 3 sentences with recommendations
	•	Streak tracker: consecutive days with at least one task completed
Crisis Mode
	•	Trigger condition: 3+ high-priority tasks due within 24 hours
	•	Agent enters crisis mode: full backlog reprioritization, emergency calendar blocking
	•	UI: red banner overlays with countdown, agent presents 'Battle Plan' with hour-by-hour schedule
	•	Push notification sent (browser Notification API) even if user is on another tab
	•	Agent estimates which tasks to deprioritize and explains why
Gamification
	•	XP system: +10 XP per task completed, +25 XP if before deadline, +50 XP for crisis survival
	•	Badges: Early Bird (5 tasks before deadline), Streak Master (7-day streak), Crisis Survivor
	•	Level system: Procrastinator → Planner → Achiever → Legend (based on XP thresholds)
	•	Weekly leaderboard (Supabase real-time query on shared leaderboard table)

PHASE 5
Polish, Testing & Demo Prep

Metric
Value
Duration
2–3 hours
Goal
Zero crashes on demo path, smooth animations, compelling presentation flow
Team Focus
Bug fixes, GSAP polish, demo script rehearsal

Polish & UX
	•	GSAP entrance animations on TaskCards, Dashboard widgets, and Chat messages
	•	Loading skeletons for all async operations — no blank screens during demo
	•	Error boundary wrapping all major components — graceful failure handling
	•	Mobile responsive layout check — judges may demo on phones
	•	Dark mode implementation (CSS variables + Zustand theme store)
Testing Checklist
	•	Auth flow: register, login, JWT refresh, logout
	•	Task CRUD: create, edit, delete, status change, subtask expansion
	•	Agent chat: multi-turn conversation, tool execution trace visible
	•	Calendar sync: read events, create event, conflict detection and resolution
	•	Crisis Mode: trigger manually with test data, verify full flow
	•	Gamification: XP award on task completion, badge unlock notification
Demo Preparation
	•	Pre-seed demo account with realistic tasks and a simulated busy week
	•	Prepare 3 demo scenarios: Regular planning, Conflict resolution, Crisis Mode
	•	Record a 2-minute screen recording as backup in case of live demo issues
	•	Prepare one-liner pitch: 'We built an AI agent that doesn't just remind you — it plans, schedules, and executes for you.'

6. API Reference

6.1 Auth Endpoints
Method
Endpoint
Description
POST
/auth/register
Register new user, returns JWT access + refresh tokens
POST
/auth/login
Login with email/password, returns JWT tokens
POST
/auth/refresh
Exchange refresh token for new access token
POST
/auth/logout
Invalidate refresh token

6.2 Task Endpoints
Method
Endpoint
Description
GET
/tasks
List all tasks for authenticated user, supports ?status=&priority= filters
POST
/tasks
Create task from natural language: { raw_input: string }
PATCH
/tasks/{id}
Update task fields: title, deadline, priority, status
DELETE
/tasks/{id}
Soft-delete task (sets deleted_at)
POST
/tasks/{id}/decompose
Trigger AI decomposition — returns subtask tree
GET
/tasks/{id}/subtasks
Get all subtasks for a parent task

6.3 Agent Endpoints
Method
Endpoint
Description
POST
/agent/chat
Send message to agent, returns streaming response (SSE)
POST
/agent/plan
Request full schedule plan for given time window
POST
/agent/crisis
Trigger crisis mode manually for testing
GET
/agent/sessions
List past agent sessions for the user
GET
/agent/sessions/{id}
Get detailed plan and actions from a specific session

6.4 Calendar Endpoints
Method
Endpoint
Description
GET
/calendar/events
Fetch calendar events for next N days (default 7)
POST
/calendar/events
Create a calendar event (agent action)
PATCH
/calendar/events/{id}
Update event time, title, or description
GET
/calendar/conflicts
Detect conflicts between tasks and calendar events
POST
/calendar/resolve
Apply AI-suggested conflict resolution
GET
/calendar/auth
Start Google OAuth flow for calendar access

6.5 Analytics Endpoints
Method
Endpoint
Description
GET
/analytics/summary
Weekly AI-generated summary for the user
GET
/analytics/completion-rate
Task completion rate by day/week/month
GET
/analytics/focus-heatmap
Productivity heatmap data for GitHub-style visualization
GET
/gamification/profile
XP, level, badges, streak for the user
GET
/gamification/leaderboard
Top users by XP for the current week

7. Complete Tech Stack

7.1 Frontend
React 18 + Vite
UI framework with fast HMR
TypeScript
Type safety across components
Tailwind CSS
Utility-first styling
ShadCN/UI
Accessible component library
Zustand
Lightweight global state
React Query
Server state + caching
GSAP
Production-grade animations
Recharts
Analytics charts
Web Speech API
Voice input (native browser)

7.2 Backend
FastAPI
Async Python REST framework
LangGraph
Agent loop orchestration
Groq (LLaMA 3)
Fast inference, task parsing
Claude Sonnet
Complex reasoning tasks
GPT-4o
Voice + vision processing
Celery + Redis
Background jobs & caching
WebSockets
Real-time agent streaming
Pydantic v2
Request/response validation
Google Calendar API
Calendar read/write

7.3 Infrastructure
Supabase
PostgreSQL + Auth + RLS
Supabase Realtime
Live leaderboard updates
Vercel
Frontend deployment
Railway / Render
Backend deployment
Upstash Redis
Serverless Redis for queues
GitHub Actions
CI/CD pipeline

8. Execution Timeline (48h Hackathon)

Phase
Time Window
Key Deliverables
Phase 1
H+0 to H+3
✓  Project scaffold
✓  Auth working
✓  DB connected
✓  LLM Router responding
Phase 2
H+3 to H+9
✓  Task CRUD complete
✓  AI decomposition live
✓  TaskCard UI done
✓  Subtask tree rendering
Phase 3
H+9 to H+16
✓  Agent loop complete
✓  Calendar OAuth done
✓  Conflict detection live
✓  Agent chat UI streaming
Phase 4
H+16 to H+21
✓  Crisis Mode live
✓  Dashboard charts rendering
✓  Gamification XP awarded
✓  Badges unlocking
Phase 5
H+21 to H+24
✓  All bugs fixed
✓  GSAP animations smooth
✓  Demo account seeded
✓  Presentation rehearsed

9. Judging Strategy & Demo Script
Judges evaluate on: Innovation, Technical Complexity, AI Integration quality, UX polish, and Presentation clarity. Structure the demo to hit each criterion in 3 minutes.

9.1 Demo Flow (3 Minutes)
Time
Segment
What to Show
0:00–0:20
Hook
Show Crisis Mode banner — grab attention immediately. 'This is what happens when 3 deadlines hit at once.'
0:20–0:50
Problem
Briefly show a chaotic task list. 'Existing tools just remind you. We actually plan for you.'
0:50–1:40
Core Demo
Type 'Prepare for ML exam by Friday' — show AI parse, decompose to subtasks, and auto-schedule in calendar.
1:40–2:10
Wow Factor
Show conflict detected + agent auto-resolving it. Then show agent chat: 'I have 3 exams this week, help me.'
2:10–2:40
Analytics
Flash productivity dashboard, XP, badges. Show the habit learning insight.
2:40–3:00
Close
'We built an AI agent that doesn't remind — it acts. This is Last-Minute Life Saver.'

9.2 Judge Questions — Prepared Answers
Likely Question
Your Answer
Why not just use Google Tasks?
Google Tasks has no AI reasoning. We have an agent that detects conflicts, decomposites work, and takes action — not just lists.
How is this different from Notion AI?
Notion AI summarizes text. Our agent executes: it writes to your calendar, restructures your week, and enters Crisis Mode autonomously.
What's your AI doing exactly?
ReAct agent loop via LangGraph — it reasons over your task list + calendar, selects tools, executes sequentially, and adapts based on your feedback.
How does the LLM router work?
Simple tasks (deadline parsing) → Groq for speed. Complex reasoning (schedule optimization) → Claude. Vision/voice → GPT-4o.
Can it scale?
Yes — Supabase scales horizontally, Celery handles async jobs, and LLM calls are stateless. Architecture supports thousands of concurrent users.

10. Risks & Mitigations

Risk
Severity
Mitigation
Google OAuth fails during demo
HIGH
Pre-authorize demo account before hackathon. Fallback: mock calendar data if OAuth fails.
LLM API rate limit hit
MEDIUM
Implement response caching in Redis. Fallback to Groq (higher rate limits) if Claude is throttled.
Agent loop produces wrong plan
MEDIUM
Add user confirmation step before any calendar write. No destructive action without approval.
Database cold start during demo
LOW
Keep Supabase project active with a cron ping. Use connection pooling (PgBouncer built-in).
Feature scope too large
HIGH
Ship MVP first (Phase 1-3). Phases 4-5 are enhancement only. Demo works without gamification.


Last-Minute Life Saver  —  Hackathon Blueprint
Build it. Ship it. Win it.
