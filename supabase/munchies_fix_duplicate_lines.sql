-- =============================================================================
-- Munchies — remove DUPLICATED receipt lines  (re-runnable, backed up first)
--
-- Run munchies_receipt_lines_check.sql first; only needed if query 1 shows
-- receipts_with_duplicate_batches > 0.
--
-- A receipt's lines are written in one transaction, so they share one
-- created_at. Extra batches on the same receipt were re-sent by the old app
-- "repair" (after the 1,000-row read hid them). We KEEP the earliest batch of
-- every receipt and remove the later copies. Every removed row is copied to
-- public.backup_receipt_lines_dupes first, so nothing is lost.
-- =============================================================================

begin;

create table if not exists public.backup_receipt_lines_dupes
  as select * from public.receipt_lines with no data;
alter table public.backup_receipt_lines_dupes add column if not exists backed_up_at timestamptz;

-- Lines that are NOT in their receipt's first batch.
create temporary table _dupe_lines on commit drop as
select l.id
from public.receipt_lines l
join (
  select receipt_id, min(created_at) as first_batch
  from public.receipt_lines
  group by receipt_id
  having count(distinct created_at) > 1
) b on b.receipt_id = l.receipt_id
where l.created_at > b.first_batch;

insert into public.backup_receipt_lines_dupes
select l.*, now()
from public.receipt_lines l
where l.id in (select id from _dupe_lines)
  and not exists (select 1 from public.backup_receipt_lines_dupes b where b.id = l.id);

delete from public.receipt_lines
where id in (select id from _dupe_lines);

-- Should now be 0.
select count(*) as receipts_still_with_duplicate_batches
from (
  select receipt_id from public.receipt_lines
  group by receipt_id having count(distinct created_at) > 1
) d;

commit;

-- Undo (only if ever needed):
--   insert into public.receipt_lines
--   select id, receipt_id, item_id, code, name, qty, unit, line_total, modifiers,
--          created_at, base_total, discount_name
--   from public.backup_receipt_lines_dupes b
--   where not exists (select 1 from public.receipt_lines l where l.id = b.id);
