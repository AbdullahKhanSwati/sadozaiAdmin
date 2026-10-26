-- =============================================================================
-- MUNCHIES — remove DUPLICATE line items from receipts
--
-- Run in the MUNCHIES Supabase project → SQL Editor → New query → paste ALL →
-- Run. It runs as ONE step: if anything fails, nothing is changed.
--
-- What it removes — and what it never touches
--   * Only receipts whose lines add up to MORE than the receipt was charged
--     (lines − ticket discount > receipts.total). Receipts that add up are
--     left exactly as they are, even if they have identical lines (a customer
--     can really order two of the same thing).
--   * On those receipts, only exact copies of another line (same item, code,
--     name, qty, price, modifiers, discount, amount) are removed — the copy
--     saved LAST goes first — and only until the lines add up to the charged
--     total again. The original line is always kept, and so is a real second
--     identical item if the total says it was paid for.
--   * Receipt totals, payments and customers are not changed (the totals were
--     right all along — only the line list was inflated).
--
-- Safety
--   * Every removed line is first copied to public.backup_dup_receipt_lines
--     (with the time it was removed), so it can be put back.
--   * Safe to run again: a second run finds nothing more to remove.
-- =============================================================================

create table if not exists public.backup_dup_receipt_lines as
  select l.*, now() as removed_at from public.receipt_lines l where false;
alter table public.backup_dup_receipt_lines enable row level security;   -- not readable from the apps

do $$
declare
  r        record;
  l        record;
  v_excess numeric;
  v_lines  int := 0;
  v_rcpts  int := 0;
  v_amount numeric := 0;
  v_hit    boolean;
begin
  -- Receipts whose lines exceed what was charged.
  for r in
    select rc.id, rc.number,
           sum(coalesce(ln.line_total, 0)) - coalesce(rc.discount, 0) - coalesce(rc.total, 0) as excess
      from public.receipts rc
      join public.receipt_lines ln on ln.receipt_id = rc.id
     group by rc.id, rc.number, rc.discount, rc.total
    having sum(coalesce(ln.line_total, 0)) - coalesce(rc.discount, 0) - coalesce(rc.total, 0) > 0.5
  loop
    v_excess := r.excess;
    v_hit := false;

    -- Exact copies on this receipt (not the first-saved one of each group),
    -- newest copy first.
    for l in
      select x.*
        from (
          select ln.*,
                 row_number() over (
                   partition by coalesce(ln.item_id, ''), coalesce(ln.code, ''), coalesce(ln.name, ''),
                                ln.qty, ln.unit, ln.line_total, coalesce(ln.base_total, ln.line_total),
                                coalesce(ln.discount_name, ''), coalesce(ln.modifiers, '[]'::jsonb)::text
                   order by ln.created_at, ln.id
                 ) as copy_no
            from public.receipt_lines ln
           where ln.receipt_id = r.id
        ) x
       where x.copy_no > 1
       order by x.created_at desc, x.id desc
    loop
      exit when v_excess <= 0.5;
      -- Only remove a copy the extra amount actually covers.
      continue when coalesce(l.line_total, 0) > v_excess + 0.5;

      insert into public.backup_dup_receipt_lines
      select ln.*, now() from public.receipt_lines ln where ln.id = l.id;
      delete from public.receipt_lines where id = l.id;

      v_excess := v_excess - coalesce(l.line_total, 0);
      v_lines  := v_lines + 1;
      v_amount := v_amount + coalesce(l.line_total, 0);
      v_hit    := true;
    end loop;

    if v_hit then v_rcpts := v_rcpts + 1; end if;
  end loop;

  raise notice 'Removed % duplicate line(s) from % receipt(s), worth Rs % in the line reports. Backup: public.backup_dup_receipt_lines',
    v_lines, v_rcpts, v_amount;
end $$;

-- -----------------------------------------------------------------------------
-- Result: receipts that STILL don't add up after the clean-up (if any). These
-- have extra lines that are not exact copies (e.g. a different drink chosen),
-- so they were left for you to check by hand. Empty result = all fixed.
-- -----------------------------------------------------------------------------
select r.number                                             as receipt_no,
       to_char(r.created_at at time zone 'Asia/Karachi', 'DD Mon YYYY HH24:MI') as sold_at,
       r.total                                              as charged_total,
       sum(coalesce(l.line_total, 0))                       as lines_total,
       round(sum(coalesce(l.line_total, 0)) - coalesce(r.discount, 0) - coalesce(r.total, 0), 2) as still_extra
  from public.receipts r
  join public.receipt_lines l on l.receipt_id = r.id
 group by r.id, r.number, r.created_at, r.total, r.discount
having sum(coalesce(l.line_total, 0)) - coalesce(r.discount, 0) - coalesce(r.total, 0) > 0.5
 order by r.created_at desc;

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
