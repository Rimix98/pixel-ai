create table if not exists public.ton_orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  amount numeric(10,2) not null,
  comment text unique not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
  tier text not null check (tier in ('pro', 'max')),
  created_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone
);

alter table public.ton_orders enable row level security;

create policy "Users can read own orders"
  on public.ton_orders for select
  using (auth.uid() = user_id);

create policy "Users can insert own orders"
  on public.ton_orders for insert
  with check (auth.uid() = user_id);
