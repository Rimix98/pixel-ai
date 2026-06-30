-- Pixel AI — Supabase Schema
-- Run this in the Supabase SQL Editor

create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  full_name text default '',
  created_at text default (now() at time zone 'utc')::text
);

create table if not exists profiles (
  id text primary key references users(id) on delete cascade,
  email text,
  full_name text default '',
  preferences text default '',
  subscription_tier text default 'free' check (subscription_tier in ('free', 'pro', 'max')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text default 'inactive',
  messages_used_hourly integer default 0,
  hourly_reset_at text default (now() at time zone 'utc')::text,
  messages_used_weekly integer default 0,
  weekly_reset_at text default (now() at time zone 'utc')::text,
  created_at text default (now() at time zone 'utc')::text,
  updated_at text default (now() at time zone 'utc')::text
);

create table if not exists projects (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  description text default '',
  instructions text default '',
  created_at text default (now() at time zone 'utc')::text,
  updated_at text default (now() at time zone 'utc')::text
);

create table if not exists conversations (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  project_id text references projects(id) on delete set null,
  title text default 'Новый чат',
  model text default 'llama3-70b-8192',
  created_at text default (now() at time zone 'utc')::text,
  updated_at text default (now() at time zone 'utc')::text
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at text default (now() at time zone 'utc')::text
);

create table if not exists artifacts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  content text default '',
  language text default 'html',
  type text default 'code' check (type in ('code', 'document', 'markdown')),
  created_at text default (now() at time zone 'utc')::text,
  updated_at text default (now() at time zone 'utc')::text
);

-- Indexes
create index if not exists idx_conversations_user_id on conversations(user_id);
create index if not exists idx_messages_conversation_id on messages(conversation_id);
create index if not exists idx_projects_user_id on projects(user_id);
create index if not exists idx_conversations_project_id on conversations(project_id);
create index if not exists idx_artifacts_user_id on artifacts(user_id);
