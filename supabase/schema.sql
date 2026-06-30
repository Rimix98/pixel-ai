-- Pixel AI — Supabase Schema
-- Run this in the Supabase SQL Editor

create table if not exists public.users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  full_name text default '',
  created_at text default (now() at time zone 'utc')::text
);

create table if not exists public.profiles (
  id text primary key references public.users(id) on delete cascade,
  email text,
  full_name text default '',
  avatar_url text default '',
  preferences text default '',
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'max')),
  subscription_status text default 'inactive',
  messages_used_hourly integer default 0,
  messages_used_weekly integer default 0,
  hourly_reset_at text,
  weekly_reset_at text,
  created_at text default (now() at time zone 'utc')::text,
  updated_at text default (now() at time zone 'utc')::text
);

create table if not exists public.projects (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  description text default '',
  instructions text default '',
  created_at text default (now() at time zone 'utc')::text,
  updated_at text default (now() at time zone 'utc')::text
);

create table if not exists public.conversations (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  project_id text references public.projects(id) on delete set null,
  title text default 'Новый чат',
  model text default 'llama3-70b-8192',
  created_at text default (now() at time zone 'utc')::text,
  updated_at text default (now() at time zone 'utc')::text
);

create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at text default (now() at time zone 'utc')::text
);

create table if not exists public.artifacts (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  content text default '',
  language text default 'html',
  type text default 'code' check (type in ('code', 'document', 'markdown')),
  created_at text default (now() at time zone 'utc')::text,
  updated_at text default (now() at time zone 'utc')::text
);

create table if not exists public.ton_orders (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  amount real not null,
  comment text unique not null,
  status text default 'pending' check (status in ('pending', 'completed', 'expired')),
  tier text not null check (tier in ('pro', 'max')),
  created_at text default (now() at time zone 'utc')::text,
  completed_at text
);

-- Indexes
create index if not exists idx_conversations_user_id on public.conversations(user_id);
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_conversations_project_id on public.conversations(project_id);
create index if not exists idx_artifacts_user_id on public.artifacts(user_id);
create index if not exists idx_ton_orders_user_id on public.ton_orders(user_id);
create index if not exists idx_ton_orders_comment on public.ton_orders(comment);

-- Disable RLS for all tables (auth handled by middleware + service role key)
alter table public.users disable row level security;
alter table public.profiles disable row level security;
alter table public.projects disable row level security;
alter table public.conversations disable row level security;
alter table public.messages disable row level security;
alter table public.artifacts disable row level security;
alter table public.ton_orders disable row level security;
