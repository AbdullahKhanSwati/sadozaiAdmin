-- =============================================================================
-- MUNCHIES — keep ONE of each identical line on a receipt, remove the copies
--
-- Run in the MUNCHIES Supabase project → SQL Editor.
--   STEP 1 (preview) is read-only — run it on its own first and check the list.
--   STEP 2 removes the copies. It runs as ONE step: if anything fails,
--          nothing is changed.
--
-- "Identical" = same receipt AND same item, code, name, qty, price, modifiers,
-- discount and amount. The FIRST saved line of each group is kept; every later
-- copy is removed. Lines that differ in anything (e.g. Dew vs Coke) are never
-- touched.
--
-- MIN_COPIES (set below in both steps, keep them the same):
--   2 → any line that appears 2 or more times is reduced to 1
--   3 → only lines that appear 3 or more times are reduced to 1 (lines that
--       appear exactly twice are left — use this if some customers really
--       order two of the same thing on separate lines)
--
-- Receipt totals, payments and customers are NOT changed. Every removed line is
-- copied to public.backup_dup_receipt_lines first (see UNDO at the bottom).
-- Safe to run again: a second run finds nothing more to remove.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- STEP 1 — PREVIEW (read-only): what will be kept and what will be removed.
-- -----------------------------------------------------------------------------
with params as (select 2 as min_copies),            -- ← MIN_COPIES
grouped as (
  select l.*,
         row_number() over w as copy_no,
         count(*)     over wp as copies
    from public.receipt_lines l
  window wp as (
    partition by l.receipt_id,
                 coalesce(l.item_id, ''), coalesce(l.code, ''), coalesce(l.name, ''),
                 l.qty, l.unit, l.line_total, coalesce(l.base_total, l.line_total),
                 coalesce(l.discount_name, ''), coalesce(l.modifiers, '[]'::jsonb)::text
  ),
         w  as (wp order by l.created_at, l.id)
)
select r.number                                               as receipt_no,
       to_char(r.created_at at time zone 'Asia/Karachi', 'DD Mon YYYY HH24:MI') as sold_at,
       trim(coalesce(g.code, '') || ' ' || coalesce(g.name, '')) as item,
       (select string_agg(m->>'name', ', ') from jsonb_array_elements(coalesce(g.modifiers, '[]'::jsonb)) m) as modifiers,
       g.line_total,
       g.copies,
       case when g.copy_no = 1 then 'KEEP' else 'remove' end   as action,
       g.id                                                    as line_id
  from grouped g
  join public.receipts r on r.id = g.receipt_id
 where g.copies >= (select min_copies from params)
 order by r.created_at desc, item, g.copy_no;

-- Summary of the preview (run on its own):
-- with params as (select 2 as min_copies), grouped as (
--   select l.receipt_id, row_number() over w as copy_no, count(*) over wp as copies, l.line_total
--     from public.receipt_lines l
--   window wp as (partition by l.receipt_id, coalesce(l.item_id,''), coalesce(l.code,''), coalesce(l.name,''),
--                l.qty, l.unit, l.line_total, coalesce(l.base_total, l.line_total),
--                coalesce(l.discount_name,''), coalesce(l.modifiers,'[]'::jsonb)::text),
--          w as (wp order by l.created_at, l.id))
-- select count(distinct receipt_id) as receipts, count(*) as lines_to_remove, sum(line_total) as amount
--   from grouped where copies >= (select min_copies from params) and copy_no > 1;


-- -----------------------------------------------------------------------------
-- STEP 2 — REMOVE the copies (keeps the first of each group).
-- -----------------------------------------------------------------------------
create table if not exists public.backup_dup_receipt_lines as
  select l.*, now() as removed_at from public.receipt_lines l where false;
alter table public.backup_dup_receipt_lines enable row level security;   -- not readable from the apps

do $$
declare
  v_min_copies int := 2;                             -- ← MIN_COPIES (same as STEP 1)
  v_lines      int;
  v_rcpts      int;
  v_amount     numeric;
begin
  create temp table dup_ids on commit drop as
  select id, receipt_id, line_total
    from (
      select l.id, l.receipt_id, l.line_total,
             row_number() over w as copy_no,
             count(*)     over wp as copies
        from public.receipt_lines l
      window wp as (
        partition by l.receipt_id,
                     coalesce(l.item_id, ''), coalesce(l.code, ''), coalesce(l.name, ''),
                     l.qty, l.unit, l.line_total, coalesce(l.base_total, l.line_total),
                     coalesce(l.discount_name, ''), coalesce(l.modifiers, '[]'::jsonb)::text
      ),
             w  as (wp order by l.created_at, l.id)
    ) x
   where x.copies >= v_min_copies and x.copy_no > 1;

  select count(*), count(distinct receipt_id), coalesce(sum(line_total), 0)
    into v_lines, v_rcpts, v_amount from dup_ids;

  insert into public.backup_dup_receipt_lines
  select l.*, now() from public.receipt_lines l where l.id in (select id from dup_ids);

  delete from public.receipt_lines where id in (select id from dup_ids);

  raise notice 'Kept one of each identical line: removed % copy line(s) from % receipt(s), worth Rs % in the line reports. Backup: public.backup_dup_receipt_lines',
    v_lines, v_rcpts, v_amount;
end $$;

-- Check: should return no rows (no identical lines left at MIN_COPIES = 2).
select r.number as receipt_no, l.name, count(*) as copies
  from public.receipt_lines l
  join public.receipts r on r.id = l.receipt_id
 group by r.number, l.receipt_id, coalesce(l.item_id, ''), coalesce(l.code, ''), l.name,
          l.qty, l.unit, l.line_total, coalesce(l.base_total, l.line_total),
          coalesce(l.discount_name, ''), coalesce(l.modifiers, '[]'::jsonb)::text
having count(*) > 1
 order by r.number;

-- =============================================================================
-- SEE WHAT WAS REMOVED (run on its own):
--   select b.removed_at, r.number as receipt_no, b.code, b.name, b.qty, b.line_total, b.id
--     from public.backup_dup_receipt_lines b
--     left join public.receipts r on r.id = b.receipt_id
--    order by b.removed_at desc, r.number;
--
-- UNDO (puts every removed line back; run on its own):
--   insert into public.receipt_lines (id, receipt_id, item_id, code, name, qty, unit, line_total, base_total, discount_name, modifiers, created_at)
--   select id, receipt_id, item_id, code, name, qty, unit, line_total, base_total, discount_name, modifiers, created_at
--     from public.backup_dup_receipt_lines
--   on conflict (id) do nothing;
-- =============================================================================
