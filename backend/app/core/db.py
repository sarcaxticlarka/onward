"""Database access layer.

Primary path: Supabase (PostgreSQL + Auth) via supabase-py.
Fallback path: local SQLite, used automatically when SUPABASE_URL/SUPABASE_KEY
are not configured, so the app is runnable without real credentials.

Both paths are exposed behind a small repository-style interface
(`Database`) so the rest of the app does not need to know which backend
is active.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import get_settings

settings = get_settings()

_supabase_client = None


def get_supabase_client():
    """Lazily create and cache the Supabase client. Returns None if unconfigured."""
    global _supabase_client
    if not settings.use_supabase:
        return None
    if _supabase_client is None:
        from supabase import create_client

        _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    return _supabase_client


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# Tables whose primary key is not "id" (e.g. refresh_tokens is keyed by token).
TABLES_WITHOUT_ID = {"refresh_tokens", "leaderboard"}


def with_id_default(table: str, row: Dict[str, Any]) -> Dict[str, Any]:
    row = dict(row)
    if table not in TABLES_WITHOUT_ID:
        row.setdefault("id", new_id())
    return row


# ---------------------------------------------------------------------------
# SQLite fallback
# ---------------------------------------------------------------------------

_SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    preferences TEXT DEFAULT '{}',
    timezone TEXT DEFAULT 'UTC',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    priority TEXT DEFAULT 'medium',
    category TEXT,
    status TEXT DEFAULT 'pending',
    parent_task_id TEXT,
    ai_score REAL DEFAULT 0,
    raw_input TEXT,
    estimated_minutes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    completed_at TEXT,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    mode TEXT DEFAULT 'chat',
    ai_plan TEXT DEFAULT '{}',
    actions_taken TEXT DEFAULT '[]',
    messages TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    pattern TEXT DEFAULT '{}',
    accuracy_score REAL DEFAULT 0,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    user_id TEXT NOT NULL,
    type TEXT,
    message TEXT,
    sent_at TEXT,
    acknowledged INTEGER DEFAULT 0,
    escalation_level TEXT DEFAULT 'subtle'
);

CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS xp_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS badges (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    badge_key TEXT NOT NULL,
    awarded_at TEXT NOT NULL,
    UNIQUE(user_id, badge_key)
);

CREATE TABLE IF NOT EXISTS leaderboard (
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    total_xp INTEGER DEFAULT 0,
    week_xp INTEGER DEFAULT 0,
    week_start TEXT
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    revoked INTEGER DEFAULT 0
);
"""


class SQLiteDB:
    def __init__(self, path: str):
        self.path = path
        self._init_schema()

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_schema(self):
        with self._conn() as conn:
            conn.executescript(_SQLITE_SCHEMA)

    @staticmethod
    def _serialize(row: Dict[str, Any]) -> Dict[str, Any]:
        out = {}
        for k, v in row.items():
            if isinstance(v, (dict, list)):
                out[k] = json.dumps(v)
            else:
                out[k] = v
        return out

    @staticmethod
    def _deserialize(table: str, row: Optional[sqlite3.Row]) -> Optional[Dict[str, Any]]:
        if row is None:
            return None
        d = dict(row)
        json_fields = {
            "users": ["preferences"],
            "tasks": [],
            "sessions": ["ai_plan", "actions_taken", "messages"],
            "habits": ["pattern"],
        }
        for f in json_fields.get(table, []):
            if d.get(f):
                try:
                    d[f] = json.loads(d[f])
                except (TypeError, json.JSONDecodeError):
                    pass
        return d

    def insert(self, table: str, row: Dict[str, Any]) -> Dict[str, Any]:
        row = with_id_default(table, row)
        ser = self._serialize(row)
        cols = ", ".join(ser.keys())
        placeholders = ", ".join("?" for _ in ser)
        with self._conn() as conn:
            conn.execute(f"INSERT INTO {table} ({cols}) VALUES ({placeholders})", list(ser.values()))
        return row

    def get(self, table: str, id: str, id_col: str = "id") -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.execute(f"SELECT * FROM {table} WHERE {id_col} = ?", (id,))
            return self._deserialize(table, cur.fetchone())

    def list(self, table: str, filters: Optional[Dict[str, Any]] = None, order_by: Optional[str] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        clauses = " AND ".join(f"{k} = ?" for k in filters)
        sql = f"SELECT * FROM {table}"
        if clauses:
            sql += f" WHERE {clauses}"
        if order_by:
            sql += f" ORDER BY {order_by}"
        with self._conn() as conn:
            cur = conn.execute(sql, list(filters.values()))
            return [self._deserialize(table, r) for r in cur.fetchall()]

    def update(self, table: str, id: str, fields: Dict[str, Any], id_col: str = "id") -> Optional[Dict[str, Any]]:
        ser = self._serialize(fields)
        if not ser:
            return self.get(table, id, id_col)
        set_clause = ", ".join(f"{k} = ?" for k in ser)
        with self._conn() as conn:
            conn.execute(f"UPDATE {table} SET {set_clause} WHERE {id_col} = ?", list(ser.values()) + [id])
        return self.get(table, id, id_col)

    def delete(self, table: str, id: str, id_col: str = "id"):
        with self._conn() as conn:
            conn.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (id,))

    def execute_raw(self, sql: str, params: tuple = ()):
        with self._conn() as conn:
            cur = conn.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]


_sqlite_db: Optional[SQLiteDB] = None


def get_sqlite_db() -> SQLiteDB:
    global _sqlite_db
    if _sqlite_db is None:
        _sqlite_db = SQLiteDB(settings.SQLITE_PATH)
    return _sqlite_db


# ---------------------------------------------------------------------------
# Direct Postgres (e.g. Neon) — same schema/shape as the SQLite fallback,
# minus Supabase-specific auth.users FKs and RLS. Auth uses local JWTs.
# ---------------------------------------------------------------------------

_PG_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ,
    priority TEXT DEFAULT 'medium',
    category TEXT,
    status TEXT DEFAULT 'pending',
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    ai_score NUMERIC(5,2) DEFAULT 0,
    raw_input TEXT,
    estimated_minutes INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pg_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_tasks_parent ON tasks(parent_task_id);

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    mode TEXT DEFAULT 'chat',
    ai_plan JSONB DEFAULT '{}'::jsonb,
    actions_taken JSONB DEFAULT '[]'::jsonb,
    messages JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pattern JSONB DEFAULT '{}'::jsonb,
    accuracy_score NUMERIC(5,2) DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT,
    message TEXT,
    sent_at TIMESTAMPTZ DEFAULT now(),
    acknowledged BOOLEAN DEFAULT false,
    escalation_level TEXT DEFAULT 'subtle'
);

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, provider)
);

CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, badge_key)
);

CREATE TABLE IF NOT EXISTS leaderboard (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT,
    total_xp INTEGER DEFAULT 0,
    week_xp INTEGER DEFAULT 0,
    week_start DATE
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS pomodoro_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 25,
    completed BOOLEAN DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(8) UNIQUE NOT NULL,
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(room_id, user_id)
);
"""


def _normalize_row(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert psycopg2 datetime/date objects to ISO strings so they match
    the SQLite/Supabase JSON shape the rest of the app expects."""
    if row is None:
        return None
    out = {}
    for k, v in row.items():
        if isinstance(v, datetime):
            out[k] = v.isoformat()
        elif hasattr(v, "isoformat") and not isinstance(v, str):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


class PostgresDB:
    """Same repository-style interface as SQLiteDB, backed by a direct
    Postgres connection (e.g. Neon). Uses a psycopg2 ThreadedConnectionPool
    so each call reuses an open SSL connection instead of re-handshaking.
    """

    def __init__(self, dsn: str):
        import psycopg2
        import psycopg2.extras
        import psycopg2.pool

        self.dsn = dsn
        self._pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=5,
            dsn=dsn,
            cursor_factory=psycopg2.extras.RealDictCursor,
        )
        self._init_schema()

    @contextmanager
    def _conn(self):
        import psycopg2

        conn = self._pool.getconn()
        try:
            # conn.closed > 0 means psycopg2 already knows the connection is dead
            if getattr(conn, 'closed', 0):
                self._pool.putconn(conn, close=True)
                conn = self._pool.getconn()
            conn.autocommit = False
            yield conn
            conn.commit()
        except psycopg2.OperationalError:
            # Neon dropped the connection server-side — swap in a fresh one and retry
            try:
                conn.rollback()
            except Exception:
                pass
            try:
                self._pool.putconn(conn, close=True)
            except Exception:
                pass
            raise  # let the caller handle; pool will issue a fresh conn next call
        except Exception:
            try:
                conn.rollback()
            except Exception:
                pass
            raise
        finally:
            try:
                if not getattr(conn, 'closed', 0):
                    self._pool.putconn(conn)
            except Exception:
                pass

    def _init_schema(self):
        with self._conn() as conn:
            cur = conn.cursor()
            cur.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')
            cur.execute(_PG_SCHEMA)

    def insert(self, table: str, row: Dict[str, Any]) -> Dict[str, Any]:
        import psycopg2.extras

        row = with_id_default(table, row)
        cols = list(row.keys())
        col_sql = ", ".join(cols)
        placeholders = ", ".join(f"%({c})s" for c in cols)
        params = {k: (psycopg2.extras.Json(v, dumps=lambda o: json.dumps(o, default=str)) if isinstance(v, (dict, list)) else v) for k, v in row.items()}
        with self._conn() as conn:
            cur = conn.cursor()
            cur.execute(f"INSERT INTO {table} ({col_sql}) VALUES ({placeholders}) RETURNING *", params)
            return _normalize_row(dict(cur.fetchone()))

    def get(self, table: str, id: str, id_col: str = "id") -> Optional[Dict[str, Any]]:
        with self._conn() as conn:
            cur = conn.cursor()
            cur.execute(f"SELECT * FROM {table} WHERE {id_col} = %s", (id,))
            row = cur.fetchone()
            return _normalize_row(dict(row)) if row else None

    def list(self, table: str, filters: Optional[Dict[str, Any]] = None, order_by: Optional[str] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        clauses = " AND ".join(f"{k} = %s" for k in filters)
        sql = f"SELECT * FROM {table}"
        if clauses:
            sql += f" WHERE {clauses}"
        if order_by:
            desc = order_by.startswith("-")
            col = order_by.lstrip("-")
            sql += f" ORDER BY {col} {'DESC' if desc else 'ASC'}"
        with self._conn() as conn:
            cur = conn.cursor()
            cur.execute(sql, list(filters.values()))
            return [_normalize_row(dict(r)) for r in cur.fetchall()]

    def update(self, table: str, id: str, fields: Dict[str, Any], id_col: str = "id") -> Optional[Dict[str, Any]]:
        import psycopg2.extras

        if not fields:
            return self.get(table, id, id_col)
        params = {k: (psycopg2.extras.Json(v, dumps=lambda o: json.dumps(o, default=str)) if isinstance(v, (dict, list)) else v) for k, v in fields.items()}
        set_clause = ", ".join(f"{k} = %({k})s" for k in params)
        params["__id"] = id
        with self._conn() as conn:
            cur = conn.cursor()
            cur.execute(f"UPDATE {table} SET {set_clause} WHERE {id_col} = %(__id)s RETURNING *", params)
            row = cur.fetchone()
            return _normalize_row(dict(row)) if row else None

    def delete(self, table: str, id: str, id_col: str = "id"):
        with self._conn() as conn:
            cur = conn.cursor()
            cur.execute(f"DELETE FROM {table} WHERE {id_col} = %s", (id,))

    def execute_raw(self, sql: str, params: tuple = ()):
        import psycopg2

        with self._conn() as conn:
            cur = conn.cursor()
            cur.execute(sql, params)
            try:
                return [_normalize_row(dict(r)) for r in cur.fetchall()]
            except psycopg2.ProgrammingError:
                return []


_pg_db: Optional[PostgresDB] = None


def get_pg_db() -> PostgresDB:
    global _pg_db
    if _pg_db is None:
        _pg_db = PostgresDB(settings.DATABASE_URL)
    return _pg_db


class Database:
    """Unified data-access facade. Routes to Supabase when configured, a
    direct Postgres DSN (DATABASE_URL) when that's set instead, otherwise
    falls back to local SQLite so the app remains runnable either way.
    """

    def __init__(self):
        self.client = get_supabase_client()
        self.is_supabase = self.client is not None
        self.is_postgres = (not self.is_supabase) and settings.use_postgres
        if self.is_postgres:
            self.pg = get_pg_db()
        elif not self.is_supabase:
            self.sqlite = get_sqlite_db()

    @property
    def _local(self):
        """The active local-style (SQLite or Postgres) backend."""
        return self.pg if self.is_postgres else self.sqlite

    def insert(self, table: str, row: Dict[str, Any]) -> Dict[str, Any]:
        row = with_id_default(table, row)
        if self.is_supabase:
            res = self.client.table(table).insert(row).execute()
            return res.data[0] if res.data else row
        return self._local.insert(table, row)

    def get(self, table: str, id: str, id_col: str = "id") -> Optional[Dict[str, Any]]:
        if self.is_supabase:
            res = self.client.table(table).select("*").eq(id_col, id).limit(1).execute()
            return res.data[0] if res.data else None
        return self._local.get(table, id, id_col)

    def list(self, table: str, filters: Optional[Dict[str, Any]] = None, order_by: Optional[str] = None) -> List[Dict[str, Any]]:
        filters = filters or {}
        if self.is_supabase:
            q = self.client.table(table).select("*")
            for k, v in filters.items():
                q = q.eq(k, v)
            if order_by:
                desc = order_by.startswith("-")
                col = order_by.lstrip("-")
                q = q.order(col, desc=desc)
            res = q.execute()
            return res.data or []
        return self._local.list(table, filters, order_by)

    def update(self, table: str, id: str, fields: Dict[str, Any], id_col: str = "id") -> Optional[Dict[str, Any]]:
        if self.is_supabase:
            res = self.client.table(table).update(fields).eq(id_col, id).execute()
            return res.data[0] if res.data else None
        return self._local.update(table, id, fields, id_col)

    def delete(self, table: str, id: str, id_col: str = "id"):
        if self.is_supabase:
            self.client.table(table).delete().eq(id_col, id).execute()
        else:
            self._local.delete(table, id, id_col)


_db: Optional[Database] = None


def get_db() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db
