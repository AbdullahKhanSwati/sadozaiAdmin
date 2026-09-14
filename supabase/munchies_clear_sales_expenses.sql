-- =============================================================================
-- MUNCHIES — CLEAR ALL SALES + EXPENSES DATA
--
-- ⚠  DESTRUCTIVE AND IRREVERSIBLE. Take a backup first:
--    Supabase → Database → Backups (or Settings → Database → Connection
--    pooling → pg_dump) before running STEP 2.
--
-- WHERE TO RUN: the MUNCHIES Supabase project → SQL Editor.
--               (Munchies and Block Factory are SEPARATE projects — running
--                this in the wrong one clears the wrong business. Confirm with
--                STEP 0 before anything else.)
--
-- WHAT IT CLEARS
--   • public.receipt_lines   — every sold line
--   • public.receipts        — every sale / refund, completed and cancelled
--   • public.expenses        — every logged expense
--   • customers.visits / customers.spent → reset to 0 (these are running totals
--     fed by sales; leaving them would show spend with no receipts behind it)
--
-- WHAT IT KEEPS
--   Catalog (items, categories, modifiers, discounts), customers themselves,
--   employees, roles, expense categories, stock items/counts, printers and
--   business settings. Only the transaction history goes.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 0 — CONFIRM YOU ARE IN THE MUNCHIES PROJECT, AND SEE WHAT WILL GO
--          Run this on its own first. Nothing is deleted by this step.
-- -----------------------------------------------------------------------------
select business_name as this_project_is
from public.business_settings
where id = 1;
-- Expect: "Munchies". If it says Block Factory, STOP — wrong project.

select 'receipts'      as table_name, count(*) as rows_to_delete from public.receipts
union all
select 'receipt_lines',      count(*) from public.receipt_lines
union all
select 'expenses',           count(*) from public.expenses
union all
select 'customers w/ spend', count(*) from public.customers where coalesce(spent, 0) <> 0
                                                              or coalesce(visits, 0) <> 0;


-- -----------------------------------------------------------------------------
-- STEP 1 — OPTIONAL SAFETY NET
--          Keeps a copy of the sales history inside the database so a mistake
--          is recoverable. Drop these tables once you are happy (STEP 4).
-- -----------------------------------------------------------------------------
create table if not exists public.backup_receipts_20260904      as select * from public.receipts;
create table if not exists public.backup_receipt_lines_20260904 as select * from public.receipt_lines;
create table if not exists public.backup_expenses_20260904      as select * from public.expenses;


-- -----------------------------------------------------------------------------
-- STEP 2 — THE CLEAR  ⚠ POINT OF NO RETURN
--          One transaction: it all succeeds or nothing changes.
--          Child rows first, so no foreign key is ever left dangling.
-- -----------------------------------------------------------------------------
begin;

  -- Sold lines (receipt_lines.receipt_id cascades on delete, but doing this
  -- explicitly makes the row count visible and the order obvious).
  delete from public.receipt_lines;

  -- Sales and refunds — every status, every date.
  delete from public.receipts;

  -- Logged expenses.
  delete from public.expenses;

  -- Running totals that only sales feed.
  update public.customers
     set visits = 0,
         spent  = 0,
         last_visit = null
   where coalesce(visits, 0) <> 0
      or coalesce(spent, 0)  <> 0
      or last_visit is not null;

commit;


-- -----------------------------------------------------------------------------
-- STEP 3 — VERIFY (all four counts must be 0)
-- -----------------------------------------------------------------------------
select 'receipts'      as table_name, count(*) as remaining from public.receipts
union all
select 'receipt_lines',      count(*) from public.receipt_lines
union all
select 'expenses',           count(*) from public.expenses
union all
select 'customers w/ spend', count(*) from public.customers where coalesce(spent, 0) <> 0
                                                              or coalesce(visits, 0) <> 0;


-- -----------------------------------------------------------------------------
-- STEP 4 — REMOVE THE SAFETY NET (only once you have checked the app/reports)
-- -----------------------------------------------------------------------------
-- drop table if exists public.backup_receipts_20260904;
-- drop table if exists public.backup_receipt_lines_20260904;
-- drop table if exists public.backup_expenses_20260904;


-- -----------------------------------------------------------------------------
-- NOT INCLUDED ON PURPOSE — uncomment only if you also want these gone
-- -----------------------------------------------------------------------------
-- Stock-check history (counts taken on each date; unrelated to sales/expenses):
-- delete from public.stock_count_items;
-- delete from public.stock_counts;
--
-- The customer records themselves (names, phones, addresses):
-- delete from public.customers;
-- =============================================================================
