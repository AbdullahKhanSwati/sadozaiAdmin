-- =============================================================================
-- Munchies — receipt line items health check  (READ-ONLY, safe to run any time)
--
-- Run in the Supabase SQL editor of the Munchies project. Nothing is changed.
--
-- Background: the app and the admin read receipt_lines in ONE request, and
-- Supabase returns at most 1,000 rows per request, so most receipts showed
-- "No line items recorded" even though their lines were saved. The app then
-- "repaired" those receipts by re-sending the lines it still had locally —
-- with new ids — which can have DUPLICATED lines. Each save writes all of a
-- receipt's lines in one transaction, so one receipt = one created_at batch;
-- more than one batch on a receipt means it was re-sent.
-- =============================================================================

-- 1) Overall numbers.
select
  (select count(*) from public.receipts)                                    as receipts,
  (select count(*) from public.receipt_lines)                               as receipt_lines,
  (select count(*) from public.receipts r
     where not exists (select 1 from public.receipt_lines l where l.receipt_id = r.id))
                                                                             as receipts_without_lines,
  (select count(*) from (
     select receipt_id from public.receipt_lines
     group by receipt_id having count(distinct created_at) > 1) d)          as receipts_with_duplicate_batches;

-- 2) The receipts from the screenshots (and any others you want to check).
select r.number, r.created_at, r.total,
       count(l.id)                     as lines,
       count(distinct l.created_at)    as batches,
       coalesce(sum(l.line_total), 0)  as lines_total
from public.receipts r
left join public.receipt_lines l on l.receipt_id = r.id
where r.number::text in ('3-4426', '3-4432', '3-4451')
group by r.id, r.number, r.created_at, r.total
order by r.created_at;

-- 3) Every receipt whose lines were re-sent (duplicate batches), newest first.
select r.number, r.created_at, r.total,
       count(l.id)                    as lines,
       count(distinct l.created_at)   as batches,
       sum(l.line_total)              as lines_total
from public.receipts r
join public.receipt_lines l on l.receipt_id = r.id
group by r.id, r.number, r.created_at, r.total
having count(distinct l.created_at) > 1
order by r.created_at desc;

-- 4) Receipts that truly have NO lines in the database (not just hidden).
select r.number, r.created_at, r.total, r.status
from public.receipts r
where not exists (select 1 from public.receipt_lines l where l.receipt_id = r.id)
order by r.created_at desc;
