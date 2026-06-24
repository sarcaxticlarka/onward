-- Last-Minute Life Saver — initial schema
-- Tables per project.md section 3.3, plus gamification (xp_events, badges,
-- leaderboard) and analytics support implied by sections 4.2/4.3/6.5.
-- Run against a Supabase Postgres project (SQL editor or `supabase db push`).

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
create table if not exists public.users (
    id uuid primary key default uuid_generate_v4() references auth.users(id) on delete cascade,
    email text unique not null,
    preferences jsonb default '{}'::jsonb,
    timezone text default 'UTC',
    created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users_select_own" on public.users
    for select using (auth.uid() = id);
create policy "users_update_own" on public.users
    for update using (auth.uid() = id);
create policy "users_insert_own" on public.users
    for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    description text,
    deadline timestamptz,
    priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
    category text,
    status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'overdue')),
    parent_task_id uuid references public.tasks(id) on delete cascade,
    ai_score numeric(5,2) default 0,
    raw_input text,
    estimated_minutes integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz,
    completed_at timestamptz,
    deleted_at timestamptz
);

create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_parent_task_id on public.tasks(parent_task_id);
create index if not exists idx_tasks_deadline on public.tasks(deadline);
create index if not exists idx_tasks_status on public.tasks(status);

alter table public.tasks enable row level security;

create policy "tasks_select_own" on public.tasks
    for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks
    for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks
    for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks
    for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- sessions (AI agent sessions)
-- ---------------------------------------------------------------------
create table if not exists public.sessions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    started_at timestamptz not null default now(),
    ended_at timestamptz,
    mode text default 'chat' check (mode in ('chat', 'plan', 'crisis')),
    ai_plan jsonb default '{}'::jsonb,
    actions_taken jsonb default '[]'::jsonb,
    messages jsonb default '[]'::jsonb
);

create index if not exists idx_sessions_user_id on public.sessions(user_id);

alter table public.sessions enable row level security;

create policy "sessions_select_own" on public.sessions
    for select using (auth.uid() = user_id);
create policy "sessions_insert_own" on public.sessions
    for insert with check (auth.uid() = user_id);
create policy "sessions_update_own" on public.sessions
    for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- habits (learned productivity patterns)
-- ---------------------------------------------------------------------
create table if not exists public.habits (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    pattern jsonb default '{}'::jsonb,
    accuracy_score numeric(5,2) default 0,
    updated_at timestamptz not null default now()
);

create index if not exists idx_habits_user_id on public.habits(user_id);

alter table public.habits enable row level security;

create policy "habits_select_own" on public.habits
    for select using (auth.uid() = user_id);
create policy "habits_insert_own" on public.habits
    for insert with check (auth.uid() = user_id);
create policy "habits_update_own" on public.habits
    for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
    id uuid primary key default uuid_generate_v4(),
    task_id uuid references public.tasks(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    type text,
    message text,
    sent_at timestamptz default now(),
    acknowledged boolean default false,
    escalation_level text default 'subtle' check (escalation_level in ('subtle', 'urgent', 'crisis'))
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_task_id on public.notifications(task_id);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
    for select using (auth.uid() = user_id);
create policy "notifications_insert_own" on public.notifications
    for insert with check (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
    for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- integrations (OAuth tokens, e.g. Google Calendar)
-- ---------------------------------------------------------------------
create table if not exists public.integrations (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    provider text not null,
    access_token text,
    refresh_token text,
    expires_at timestamptz,
    created_at timestamptz not null default now(),
    unique (user_id, provider)
);

create index if not exists idx_integrations_user_id on public.integrations(user_id);

alter table public.integrations enable row level security;

create policy "integrations_select_own" on public.integrations
    for select using (auth.uid() = user_id);
create policy "integrations_insert_own" on public.integrations
    for insert with check (auth.uid() = user_id);
create policy "integrations_update_own" on public.integrations
    for update using (auth.uid() = user_id);
create policy "integrations_delete_own" on public.integrations
    for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- xp_events (gamification ledger)
-- ---------------------------------------------------------------------
create table if not exists public.xp_events (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    amount integer not null,
    reason text,
    created_at timestamptz not null default now()
);

create index if not exists idx_xp_events_user_id on public.xp_events(user_id);

alter table public.xp_events enable row level security;

create policy "xp_events_select_own" on public.xp_events
    for select using (auth.uid() = user_id);
create policy "xp_events_insert_own" on public.xp_events
    for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- badges
-- ---------------------------------------------------------------------
create table if not exists public.badges (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.users(id) on delete cascade,
    badge_key text not null,
    awarded_at timestamptz not null default now(),
    unique (user_id, badge_key)
);

create index if not exists idx_badges_user_id on public.badges(user_id);

alter table public.badges enable row level security;

create policy "badges_select_own" on public.badges
    for select using (auth.uid() = user_id);
create policy "badges_insert_own" on public.badges
    for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- leaderboard (aggregated XP totals; readable by all authenticated users
-- so the weekly leaderboard can be displayed, writable only by the owner)
-- ---------------------------------------------------------------------
create table if not exists public.leaderboard (
    user_id uuid primary key references public.users(id) on delete cascade,
    display_name text,
    total_xp integer default 0,
    week_xp integer default 0,
    week_start date
);

alter table public.leaderboard enable row level security;

create policy "leaderboard_select_all" on public.leaderboard
    for select using (auth.role() = 'authenticated');
create policy "leaderboard_upsert_own" on public.leaderboard
    for insert with check (auth.uid() = user_id);
create policy "leaderboard_update_own" on public.leaderboard
    for update using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- updated_at trigger helper for tasks/habits
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
    before update on public.tasks
    for each row execute function public.set_updated_at();
