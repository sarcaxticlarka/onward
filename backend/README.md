# LMLS — Backend

FastAPI (async) + LangGraph ReAct agent + Supabase/Neon/SQLite + LLM Router.

## Quick start

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env    # add your keys (app works without them in SQLite mode)
uvicorn app.main:app --reload --port 8000
```

Swagger UI → http://localhost:8000/docs

## Zero-config mode

Leave `.env` empty. The app auto-creates `lmls_local.db` (SQLite) and falls back
to heuristic parsing when no LLM API keys are present. Every route stays functional.

## Database migration (Supabase)

```bash
supabase db push --db-url "$SUPABASE_DB_URL"
# SQL: migrations/001_init.sql
```

## Full documentation

See the root [`README.md`](../README.md) for:
- Complete feature list
- Architecture diagram
- Use-case & ER diagrams
- Full API reference (all endpoints)
- Environment variable reference
- Gamification reference
