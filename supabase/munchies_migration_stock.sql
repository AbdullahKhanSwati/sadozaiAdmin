-- =============================================================================
-- MUNCHIES — migration: Stock checker (staff stock counts)
-- Run in the Munchies Supabase project (SQL Editor). Safe to re-run.
--
-- Model: each "stock entry" = one full count of all items on a date
--   stock_counts       — the entry (date, who, note)
--   stock_count_items  — the per-item quantity within that entry
-- =============================================================================

create table if not exists public.stock_counts (
  id          text primary key default gen_random_uuid()::text,
  counted_on  date not null default current_date,   -- the (editable) stock date
  note        text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists stock_counts_date_idx on public.stock_counts (counted_on desc, created_at desc);

create table if not exists public.stock_count_items (
  id         bigint generated always as identity primary key,
  count_id   text not null references public.stock_counts(id) on delete cascade,
  item_id    text references public.items(id) on delete set null,
  item_name  text not null,                         -- snapshot of the item name
  quantity   numeric not null default 0,
  created_at timestamptz default now()
);
create index if not exists stock_count_items_count_idx on public.stock_count_items (count_id);

-- RLS: any authenticated user (staff + admin) can read/write, like receipts.
alter table public.stock_counts       enable row level security;
alter table public.stock_count_items  enable row level security;
drop policy if exists "auth all" on public.stock_counts;
create policy "auth all" on public.stock_counts
  for all to authenticated using (true) with check (true);
drop policy if exists "auth all" on public.stock_count_items;
create policy "auth all" on public.stock_count_items
  for all to authenticated using (true) with check (true);

-- Realtime so the admin sees new entries live.
do $$ begin alter publication supabase_realtime add table public.stock_counts;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.stock_count_items; exception when duplicate_object then null; end $$;
