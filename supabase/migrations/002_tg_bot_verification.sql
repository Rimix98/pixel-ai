-- Telegram bot verification support
-- Run this in the Supabase SQL Editor

-- Pending registrations (before TG verification)
CREATE TABLE IF NOT EXISTS public.pending_registrations (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  created_at text default (now() at time zone 'utc')::text
);

-- Verification codes table
CREATE TABLE IF NOT EXISTS public.tg_bot_verification (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.pending_registrations(id) on delete cascade,
  code text not null,
  attempts integer default 0,
  expires_at text not null,
  used_at text,
  created_at text default (now() at time zone 'utc')::text
);

CREATE INDEX IF NOT EXISTS idx_tg_bot_verification_user_id ON public.tg_bot_verification(user_id);
ALTER TABLE public.pending_registrations disable row level security;
ALTER TABLE public.tg_bot_verification disable row level security;
