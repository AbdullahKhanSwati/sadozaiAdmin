-- =============================================================================
-- MUNCHIES — migration: Stock checker gets its OWN items + categories
-- (separate from the POS sale items). Run in the Munchies Supabase project.
-- Safe to re-run. Requires munchies_migration_stock.sql to have been run first
-- (stock_counts / stock_count_items).
-- =============================================================================

-- Stock categories (e.g. Drinks, Sauces) — for grouping stock items.
create table if not exists public.stock_categories (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Stock items — the things counted in the stock checker (NOT the sale items).
create table if not exists public.stock_items (
  id          text primary key default gen_random_uuid()::text,
  name        text not null,
  category_id text references public.stock_categories(id) on delete set null,
  sort_order  int default 0,
  created_at  timestamptz default now()
);
create index if not exists stock_items_category_idx on public.stock_items (category_id);

-- Count lines now reference stock_items (item_name stays as a snapshot).
alter table public.stock_count_items add column if not exists stock_item_id text references public.stock_items(id) on delete set null;

-- RLS: any authenticated user (staff + admin).
alter table public.stock_categories enable row level security;
alter table public.stock_items      enable row level security;
drop policy if exists "auth all" on public.stock_categories;
create policy "auth all" on public.stock_categories for all to authenticated using (true) with check (true);
drop policy if exists "auth all" on public.stock_items;
create policy "auth all" on public.stock_items for all to authenticated using (true) with check (true);

-- Realtime.
do $$ begin alter publication supabase_realtime add table public.stock_categories; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.stock_items;      exception when duplicate_object then null; end $$;
