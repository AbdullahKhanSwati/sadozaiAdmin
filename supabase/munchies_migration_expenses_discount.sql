-- =============================================================================
-- MUNCHIES — migration: DB-backed expenses + receipt discount name
-- Run this in the Munchies Supabase project (SQL Editor). Safe to re-run.
-- =============================================================================

-- 1) Receipts: remember which named discount was applied (amount already exists
--    in the `discount` column). Lets the receipt show the discount line.
alter table public.receipts add column if not exists discount_name text;

-- 1b) Receipt lines: remember each line's ORIGINAL (pre-discount) total and the
--     name of any per-item discount, so the receipt can list lines at full value
--     with a named discount summary line. `line_total` already stores the final.
alter table public.receipt_lines add column if not exists base_total numeric;
alter table public.receipt_lines add column if not exists discount_name text;

-- 2) Expenses: persist logged costs (previously local-only in the app).
create table if not exists public.expenses (
  id          text primary key default gen_random_uuid()::text,
  category    text default 'Other',
  amount      numeric not null default 0,
  description text default '',
  spent_on    date not null default current_date,   -- the (editable) expense date
  created_at  timestamptz default now()
);
create index if not exists expenses_spent_on_idx on public.expenses (spent_on desc);

-- RLS: any authenticated user (staff + admin) can read/write expenses,
-- matching customers/receipts.
alter table public.expenses enable row level security;
drop policy if exists "auth all" on public.expenses;
create policy "auth all" on public.expenses
  for all to authenticated
  using (true) with check (true);

-- Realtime so the list updates live across devices/admin.
do $$ begin
  alter publication supabase_realtime add table public.expenses;
exception when duplicate_object then null; end $$;
