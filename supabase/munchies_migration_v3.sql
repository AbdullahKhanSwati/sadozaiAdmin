-- =============================================================================
-- MUNCHIES — migration v3
--   1) Order cancellation      (receipts.status / cancelled_at / cancel_reason)
--   2) Expense categories      (admin-managed list, used by app + admin)
--   3) Saved printers          (shared list the app can restore on any device)
--
-- Run in the Munchies Supabase project → SQL Editor → New query → Run.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT / drop-then-create policies).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) ORDER CANCELLATION
--    A cancelled receipt is KEPT (audit trail) but excluded from every sales
--    figure: gross sales, discounts, net sales, item/category/employee reports.
-- -----------------------------------------------------------------------------
alter table public.receipts add column if not exists status        text not null default 'completed'; -- 'completed' | 'cancelled'
alter table public.receipts add column if not exists cancelled_at  timestamptz;
alter table public.receipts add column if not exists cancel_reason text;
alter table public.receipts add column if not exists cancelled_by  text;

-- Backfill any pre-existing rows (default only applies to new inserts).
update public.receipts set status = 'completed' where status is null;

create index if not exists receipts_status_idx on public.receipts (status);

-- -----------------------------------------------------------------------------
-- 2) EXPENSE CATEGORIES
--    Admin creates/renames/deletes them; the app shows them on the Add-expense
--    form. `expenses.category` stays a plain text column, so deleting a category
--    never orphans or rewrites historic expenses.
-- -----------------------------------------------------------------------------
create table if not exists public.expense_categories (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);
create unique index if not exists expense_categories_name_uniq
  on public.expense_categories (lower(name));

alter table public.expense_categories enable row level security;

-- Read: everyone signed in (the app needs the list). Write: admins only.
drop policy if exists "read all" on public.expense_categories;
create policy "read all" on public.expense_categories
  for select to authenticated using (true);
drop policy if exists "admin write" on public.expense_categories;
create policy "admin write" on public.expense_categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Seed with the categories that were previously hard-coded in the app/admin.
insert into public.expense_categories (id, name, sort_order) values
  ('ec1', 'Ingredients', 1),
  ('ec2', 'Salaries',    2),
  ('ec3', 'Rent',        3),
  ('ec4', 'Utilities',   4),
  ('ec5', 'Repair',      5),
  ('ec6', 'Other',       6)
on conflict (id) do nothing;

-- Also pull in any category text already used by existing expenses so nothing
-- silently disappears from the dropdown.
insert into public.expense_categories (name, sort_order)
select distinct e.category, 99
  from public.expenses e
 where coalesce(trim(e.category), '') <> ''
   and not exists (
     select 1 from public.expense_categories c
      where lower(c.name) = lower(e.category)
   );

-- -----------------------------------------------------------------------------
-- 3) SAVED PRINTERS
--    The device keeps its own copy in local storage (Bluetooth pairing is
--    per-device), but storing them here too means a re-installed / second
--    tablet gets the printer list back without re-scanning.
-- -----------------------------------------------------------------------------
create table if not exists public.printers (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  model      text default 'Generic ESC/POS (Bluetooth)',
  bluetooth  text,                                   -- device name as reported over BT
  address    text,                                   -- MAC address
  is_default boolean not null default false,
  created_at timestamptz default now()
);

alter table public.printers enable row level security;
drop policy if exists "auth all" on public.printers;
create policy "auth all" on public.printers
  for all to authenticated using (true) with check (true);

-- -----------------------------------------------------------------------------
-- REALTIME — so the app and admin see each other's changes live.
-- -----------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.expense_categories; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.printers;           exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.expenses;           exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.receipts;           exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.receipt_lines;      exception when duplicate_object then null; end $$;

-- =============================================================================
-- HANDY QUERIES (run individually when you need them — not part of the migration)
-- =============================================================================
-- Cancel one order by receipt number:
--   update public.receipts
--      set status = 'cancelled', cancelled_at = now(), cancel_reason = 'Wrong order'
--    where number = '3-3987';
--
-- Un-cancel (restore) an order:
--   update public.receipts
--      set status = 'completed', cancelled_at = null, cancel_reason = null
--    where number = '3-3987';
--
-- List cancelled orders:
--   select number, total, cancel_reason, cancelled_at
--     from public.receipts where status = 'cancelled' order by cancelled_at desc;
--
-- Add an expense category:
--   insert into public.expense_categories (name, sort_order) values ('Marketing', 7);
--
-- Rename a category (historic expenses keep the old text unless you also run the
-- second statement):
--   update public.expense_categories set name = 'Utilities & Bills' where name = 'Utilities';
--   update public.expenses set category = 'Utilities & Bills' where category = 'Utilities';
--
-- Daily totals incl. expenses (what the admin Summary export produces):
--   select d::date as day,
--          coalesce(s.gross, 0)    as gross_sales,
--          coalesce(s.discount, 0) as discounts,
--          coalesce(s.gross, 0) - coalesce(s.discount, 0) as net_sales,
--          coalesce(x.expenses, 0) as expenses,
--          coalesce(s.gross, 0) - coalesce(s.discount, 0) - coalesce(x.expenses, 0) as net_profit
--     from generate_series(current_date - interval '30 days', current_date, interval '1 day') d
--     left join (
--       select created_at::date as day, sum(subtotal) gross, sum(discount) discount
--         from public.receipts
--        where type = 'Sale' and status <> 'cancelled'
--        group by 1
--     ) s on s.day = d::date
--     left join (
--       select spent_on as day, sum(amount) expenses from public.expenses group by 1
--     ) x on x.day = d::date
--    order by day desc;
-- =============================================================================
