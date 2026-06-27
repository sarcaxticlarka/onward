# LMLS — Frontend

React 18 + TypeScript + Vite frontend for Last-Minute Life Saver.

## Quick start

```bash
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:8000
npm run dev            # → http://localhost:5173
npm run build          # production build → dist/
```

## Key pages

| Route | Component | Description |
|---|---|---|
| `/` | LandingPage | Marketing landing |
| `/login` | LoginPage | Email/pw + Google OAuth |
| `/register` | RegisterPage | New account |
| `/dashboard` | DashboardPage | Overview + agent quick-chat |
| `/tasks` | TasksPage | Full task manager (voice, templates, CRUD) |
| `/agent` | AgentPage | Full LangGraph agent chat panel |
| `/analytics` | AnalyticsPage | Charts, heatmap, streak, risk |
| `/crisis` | CrisisPage | Crisis mode + battle plan |
| `/rooms` | RoomsPage | Peer accountability rooms |
| `/report` | WeeklyReportPage | AI weekly report card |
| `/profile` | ProfilePage | Account info, sign out |

## Environment

```
VITE_API_URL=http://localhost:8000
```

See the root `README.md` for full project documentation.
