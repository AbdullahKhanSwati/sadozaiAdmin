-- =============================================================================
-- MUNCHIES — find receipts that have DUPLICATE line items   (READ-ONLY)
--
-- Run in the MUNCHIES Supabase project → SQL Editor → New query → Run.
-- Nothing is changed or deleted. Run each query on its own (select it, Run).
--
-- How a duplicate is recognised
--   * the same item appears more than once on a receipt with EVERYTHING the
--     same: item, code, name, qty, price, modifiers, discount and amount; and
--   * the receipt's lines add up to MORE than the receipt was actually charged
--     (receipts.total, which the sale saved and nothing has rewritten).
--   A customer can genuinely order two identical items — then the lines still
--   add up to the receipt total, and `extra_amount` is 0. Only rows with
--   extra_amount > 0 have lines that were stored twice.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- QUERY 1 — one row per receipt that has identical lines, newest first.
--   lines_total   = what the lines add up to (after per-item discounts)
--   charged_total = receipts.total (what the customer paid)
--   extra_amount  = lines_total − ticket discount − charged_total
--                   > 0  → duplicate lines inflate this receipt
--                   = 0  → identical lines are a real order (leave them)
--   extra_lines   = how many copies are surplus (copies − 1, summed)
-- -----------------------------------------------------------------------------
with lines as (
  select l.*,
         count(*) over (
           partition by l.receipt_id,
                        coalesce(l.item_id, ''), coalesce(l.code, ''), coalesce(l.name, ''),
                        l.qty, l.unit, l.line_total, coalesce(l.base_total, l.line_total),
                        coalesce(l.discount_name, ''), coalesce(l.modifiers, '[]'::jsonb)::text
         ) as copies
    from public.receipt_lines l
),
per_receipt as (
  select receipt_id,
         count(*)                                   as line_count,
         sum(coalesce(line_total, 0))               as lines_total,
         count(*) filter (where copies > 1)         as lines_in_dup_groups,
         count(distinct (coalesce(item_id, '') || '|' || coalesce(name, '') || '|' || qty || '|' || line_total || '|' || coalesce(modifiers, '[]'::jsonb)::text))
           filter (where copies > 1)                as dup_groups,
         min(created_at)                            as first_line_saved,
         max(created_at)                            as last_line_saved
    from lines
   group by receipt_id
)
select r.number                                                         as receipt_no,
       to_char(r.created_at at time zone 'Asia/Karachi', 'DD Mon YYYY HH24:MI') as sold_at,
       coalesce(r.status, 'completed')                                  as status,
       p.line_count,
       p.dup_groups,
       p.lines_in_dup_groups - p.dup_groups                             as extra_lines,
       p.lines_total,
       coalesce(r.discount, 0)                                          as ticket_discount,
       r.total                                                          as charged_total,
       round(p.lines_total - coalesce(r.discount, 0) - coalesce(r.total, 0), 2) as extra_amount,
       to_char(p.last_line_saved at time zone 'Asia/Karachi', 'DD Mon YYYY HH24:MI') as last_line_saved,
       r.id                                                             as receipt_id
  from per_receipt p
  join public.receipts r on r.id = p.receipt_id
 where p.dup_groups > 0
 order by (p.lines_total - coalesce(r.discount, 0) - coalesce(r.total, 0) > 0.5) desc,
          r.created_at desc;


-- -----------------------------------------------------------------------------
-- QUERY 2 — the duplicated lines themselves (only receipts whose lines add up
-- to more than they were charged). `keep` = the first saved copy of each group;
-- the other copies are the ones stored twice.
-- -----------------------------------------------------------------------------
with lines as (
  select l.*,
         row_number() over (
           partition by l.receipt_id,
                        coalesce(l.item_id, ''), coalesce(l.code, ''), coalesce(l.name, ''),
                        l.qty, l.unit, l.line_total, coalesce(l.base_total, l.line_total),
                        coalesce(l.discount_name, ''), coalesce(l.modifiers, '[]'::jsonb)::text
           order by l.created_at, l.id
         ) as copy_no,
         count(*) over (
           partition by l.receipt_id,
                        coalesce(l.item_id, ''), coalesce(l.code, ''), coalesce(l.name, ''),
                        l.qty, l.unit, l.line_total, coalesce(l.base_total, l.line_total),
                        coalesce(l.discount_name, ''), coalesce(l.modifiers, '[]'::jsonb)::text
         ) as copies
    from public.receipt_lines l
),
inflated as (
  select r.id
    from public.receipts r
    join (select receipt_id, sum(coalesce(line_total, 0)) as lines_total from public.receipt_lines group by receipt_id) t
      on t.receipt_id = r.id
   where t.lines_total - coalesce(r.discount, 0) - coalesce(r.total, 0) > 0.5
)
select r.number                                   as receipt_no,
       to_char(r.created_at at time zone 'Asia/Karachi', 'DD Mon YYYY HH24:MI') as sold_at,
       trim(coalesce(l.code, '') || ' ' || coalesce(l.name, '')) as item,
       l.qty,
       l.line_total,
       (select string_agg(m->>'name', ', ') from jsonb_array_elements(coalesce(l.modifiers, '[]'::jsonb)) m) as modifiers,
       l.copies,
       l.copy_no,
       case when l.copy_no = 1 then 'keep' else 'duplicate' end as looks_like,
       to_char(l.created_at at time zone 'Asia/Karachi', 'DD Mon YYYY HH24:MI:SS') as line_saved_at,
       l.id                                       as line_id
  from lines l
  join public.receipts r on r.id = l.receipt_id
 where l.copies > 1
   and l.receipt_id in (select id from inflated)
 order by r.created_at desc, item, l.copy_no;


-- -----------------------------------------------------------------------------
-- QUERY 3 — totals only: how many receipts / lines / rupees are affected.
-- -----------------------------------------------------------------------------
with t as (
  select r.id, r.total, coalesce(r.discount, 0) as discount, sum(coalesce(l.line_total, 0)) as lines_total, count(*) as n
    from public.receipts r
    join public.receipt_lines l on l.receipt_id = r.id
   group by r.id, r.total, r.discount
)
select count(*)                                           as receipts_with_extra_lines,
       round(sum(lines_total - discount - coalesce(total, 0)), 2) as extra_amount_in_line_reports
  from t
 where lines_total - discount - coalesce(total, 0) > 0.5;
-- =============================================================================
