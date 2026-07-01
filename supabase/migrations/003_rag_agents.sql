-- RAG: Knowledge Base tables
-- Run this in the Supabase SQL Editor

create table if not exists public.knowledge_documents (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  title text not null,
  source text default 'manual',
  chunk_count integer default 0,
  total_tokens integer default 0,
  metadata text default '{}',
  created_at text default (now() at time zone 'utc')::text
);

create table if not exists public.knowledge_chunks (
  id text primary key,
  document_id text not null references public.knowledge_documents(id) on delete cascade,
  user_id text not null references public.users(id) on delete cascade,
  content text not null,
  chunk_index integer default 0,
  token_count integer default 0,
  keywords text default '',
  created_at text default (now() at time zone 'utc')::text
);

-- Agents & Workflows: run history
create table if not exists public.workflow_runs (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  workflow_id text not null,
  input text default '',
  output text default '',
  steps_json text default '[]',
  total_tokens integer default 0,
  duration_ms integer default 0,
  success boolean default true,
  created_at text default (now() at time zone 'utc')::text
);

-- Indexes
create index if not exists idx_knowledge_documents_user_id on public.knowledge_documents(user_id);
create index if not exists idx_knowledge_chunks_document_id on public.knowledge_chunks(document_id);
create index if not exists idx_knowledge_chunks_user_id on public.knowledge_chunks(user_id);
create index if not exists idx_workflow_runs_user_id on public.workflow_runs(user_id);

-- Disable RLS
alter table public.knowledge_documents disable row level security;
alter table public.knowledge_chunks disable row level security;
alter table public.workflow_runs disable row level security;
