-- =============================================================================
-- MUNCHIES — migration v4
--
--   1) Sales integrity   receipts.subtotal is the GROSS (pre-discount) value
--                        again, so Discounts stop showing 0 when a per-item
--                        discount was used. (Data fix — nothing is deleted.)
--   2) Atomic receipts   munchies_save_receipt() writes a receipt AND its lines
--                        in ONE transaction and is safe to retry, so a receipt
--                        can never again land without its line items.
--   3) Menu ordering     natural_sort_key() + a generated `sort_key` column on
--                        categories / items / expense_categories, so the
--                        backend orders "1 Burgers, 1.1 …, 1.10 …, 2 Fries,
--                        2.2 Drinks" the same way the admin and the app do.
--   4) Modifier ordering every modifier gets a distinct sort_order and the
--                        admin's drag-and-drop saves through
--                        munchies_reorder_modifiers().
--
-- Run in the MUNCHIES Supabase project → SQL Editor → New query → Run.
-- Safe to re-run. Requires munchies_schema.sql + munchies_migration_v3.sql.
-- NOTHING IS DELETED by this migration.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) SALES INTEGRITY — gross vs. discount on existing receipts
--    The app used to store subtotal = Σ line_total (i.e. AFTER per-item
--    discounts) while `discount` only held the whole-ticket discount. Such a
--    receipt shows subtotal == total and discount == 0.
--    Convention from now on (app + admin agree):
--      subtotal = Σ base_total            (gross, before ANY discount)
--      discount = whole-ticket discount   (per-item discounts live on the lines
--                                          as base_total − line_total)
--      total    = subtotal − discount − Σ(base_total − line_total)
--    Only receipts that carry the old signature are touched.
-- -----------------------------------------------------------------------------
with agg as (
  select receipt_id,
         sum(coalesce(base_total, line_total, 0)) as gross,
         sum(coalesce(line_total, 0))             as net
    from public.receipt_lines
   group by receipt_id
)
update public.receipts r
   set subtotal = agg.gross
  from agg
 where agg.receipt_id = r.id
   and agg.gross > agg.net                                   -- a per-item discount exists …
   and abs(coalesce(r.subtotal, 0) - agg.net) < 0.005;       -- … and subtotal was stored after it


-- -----------------------------------------------------------------------------
-- 2) ATOMIC RECEIPT SAVE — receipt + lines in one transaction, retry-safe
--    * The receipt and every line are written with the ids the app generated,
--      using ON CONFLICT DO NOTHING, so replaying the same sale after a dropped
--      connection completes it instead of failing with "duplicate key".
--    * item_id / customer_id / employee_id that no longer exist are stored as
--      NULL instead of failing the whole sale on a foreign-key error.
--    * A cancellation that was queued on top of the sale is honoured.
--    Runs as the caller (RLS applies): any signed-in staff/admin can save sales.
-- -----------------------------------------------------------------------------
create or replace function public.munchies_save_receipt(p_receipt jsonb, p_lines jsonb default '[]'::jsonb)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_id        text := nullif(p_receipt->>'id', '');
  v_had_lines boolean;
  l           jsonb;
begin
  if v_id is null then v_id := gen_random_uuid()::text; end if;

  insert into public.receipts as r (
    id, number, type, employee_id, customer_id, subtotal, discount, discount_name, total, dining,
    status, cancelled_at, cancel_reason, cancelled_by, created_at
  )
  values (
    v_id,
    p_receipt->>'number',
    coalesce(nullif(p_receipt->>'type', ''), 'Sale'),
    (select e.id from public.employees e where e.id = p_receipt->>'employee_id'),
    (select c.id from public.customers c where c.id = p_receipt->>'customer_id'),
    coalesce((p_receipt->>'subtotal')::numeric, 0),
    coalesce((p_receipt->>'discount')::numeric, 0),
    nullif(p_receipt->>'discount_name', ''),
    coalesce((p_receipt->>'total')::numeric, 0),
    nullif(p_receipt->>'dining', ''),
    coalesce(nullif(p_receipt->>'status', ''), 'completed'),
    (p_receipt->>'cancelled_at')::timestamptz,
    nullif(p_receipt->>'cancel_reason', ''),
    nullif(p_receipt->>'cancelled_by', ''),
    coalesce((p_receipt->>'created_at')::timestamptz, now())
  )
  on conflict (id) do update
     set status        = excluded.status,
         cancelled_at  = excluded.cancelled_at,
         cancel_reason = excluded.cancel_reason,
         cancelled_by  = excluded.cancelled_by
   where excluded.status = 'cancelled' and r.status <> 'cancelled';

  select exists (select 1 from public.receipt_lines where receipt_id = v_id) into v_had_lines;

  for l in select value from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    -- A line without an id can't be de-duplicated, so only accept it the first
    -- time (older app builds); lines with ids are always safe to replay.
    if nullif(l->>'id', '') is null and v_had_lines then
      continue;
    end if;
    insert into public.receipt_lines (
      id, receipt_id, item_id, code, name, qty, unit, line_total, base_total, discount_name, modifiers
    )
    values (
      coalesce(nullif(l->>'id', ''), gen_random_uuid()::text),
      v_id,
      (select i.id from public.items i where i.id = l->>'item_id'),
      l->>'code',
      l->>'name',
      coalesce((l->>'qty')::numeric, 1),
      coalesce((l->>'unit')::numeric, 0),
      coalesce((l->>'line_total')::numeric, 0),
      coalesce((l->>'base_total')::numeric, (l->>'line_total')::numeric, 0),
      nullif(l->>'discount_name', ''),
      case when jsonb_typeof(l->'modifiers') = 'array' then l->'modifiers' else '[]'::jsonb end
    )
    on conflict (id) do nothing;
  end loop;

  return v_id;
end;
$$;
revoke all on function public.munchies_save_receipt(jsonb, jsonb) from public, anon;
grant execute on function public.munchies_save_receipt(jsonb, jsonb) to authenticated;


-- -----------------------------------------------------------------------------
-- 3) NATURAL MENU ORDERING
--    natural_sort_key('1.9.1 1 PC Fried Chicken') builds a text key whose plain
--    byte order equals the human "menu" order:
--      1 Burgers < 1.1 Crispy < 1.2.1 Chicken < 1.9 Fried < 1.10 X < 2 Fries < 2.2 Drinks
--    * leading dotted code compared number-by-number (1.9 < 1.10, 1 < 1.1)
--    * the remainder compared digit-aware and case-insensitively
--    * names with no leading number sort after all numbered ones
--    A stored `sort_key` column (C collation) on each catalog table exposes it,
--    so `order by sort_key` / PostgREST `.order('sort_key')` is the menu order.
--    The admin and the app apply the identical rule client-side as well.
-- -----------------------------------------------------------------------------
create or replace function public.natural_sort_key(txt text)
returns text
language plpgsql
immutable
strict
parallel safe
as $$
declare
  s    text := btrim(coalesce(txt, ''));
  code text;
  rest text;
  key  text := '';
  part text;
begin
  code := substring(s from '^(\d+(?:\.\d+)*)');
  if code is null then
    rest := s;
    key  := '~';                                   -- no numeric code → after the numbered ones
  else
    rest := substring(s from length(code) + 1);
    foreach part in array string_to_array(code, '.') loop
      key := key || lpad(coalesce(nullif(ltrim(part, '0'), ''), '0'), 10, '0') || '.';
    end loop;
    key := rtrim(key, '.') || ' ';                 -- space (0x20) < '.' so "1" sorts before "1.1"
  end if;

  key := key || '|' || coalesce((
    select string_agg(
             case when m[1] ~ '^\d+$'
                  then lpad(coalesce(nullif(ltrim(m[1], '0'), ''), '0'), 10, '0')
                  else lower(m[1]) end,
             '' order by ord)
      from regexp_matches(rest, '(\d+|\D+)', 'g') with ordinality as t(m, ord)
  ), '');
  return key;
end;
$$;

-- Stored, C-collated key columns (dropped + re-added so a re-run always
-- reflects the current function; the column is derived, so nothing is lost).
alter table public.categories         drop column if exists sort_key;
alter table public.categories         add column sort_key text collate "C"
  generated always as (public.natural_sort_key(name)) stored;
create index if not exists categories_sort_key_idx on public.categories (sort_key);

alter table public.items              drop column if exists sort_key;
alter table public.items              add column sort_key text collate "C"
  generated always as (public.natural_sort_key(coalesce(code, '') || ' ' || coalesce(name, ''))) stored;
create index if not exists items_sort_key_idx on public.items (sort_key);

alter table public.expense_categories drop column if exists sort_key;
alter table public.expense_categories add column sort_key text collate "C"
  generated always as (public.natural_sort_key(name)) stored;
create index if not exists expense_categories_sort_key_idx on public.expense_categories (sort_key);

-- Keep the legacy sort_order columns in step with the menu order so anything
-- still ordering by sort_order (older app builds, cached queries) agrees.
with ranked as (
  select id, row_number() over (order by sort_key, created_at, id) as rn from public.categories
)
update public.categories c set sort_order = ranked.rn from ranked where ranked.id = c.id;

with ranked as (
  select id, row_number() over (order by sort_key, created_at, id) as rn from public.expense_categories
)
update public.expense_categories c set sort_order = ranked.rn from ranked where ranked.id = c.id;


-- -----------------------------------------------------------------------------
-- 4) MODIFIER ORDERING (admin drag-and-drop → app)
--    Give every modifier a distinct position (current visual order preserved;
--    new / never-ordered ones keep their place at the end), and add an RPC that
--    stores a whole new order in one statement.
-- -----------------------------------------------------------------------------
with ranked as (
  select id,
         row_number() over (
           order by case when coalesce(sort_order, 0) <= 0 then 1 else 0 end,  -- unordered → last
                    sort_order, created_at, name, id
         ) as rn
    from public.modifiers
)
update public.modifiers m set sort_order = ranked.rn from ranked where ranked.id = m.id;

create or replace function public.munchies_reorder_modifiers(p_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reorder modifiers.';
  end if;
  update public.modifiers m
     set sort_order = x.ord
    from unnest(p_ids) with ordinality as x(id, ord)
   where m.id = x.id;
end;
$$;
revoke all on function public.munchies_reorder_modifiers(text[]) from public, anon;
grant execute on function public.munchies_reorder_modifiers(text[]) to authenticated;


-- -----------------------------------------------------------------------------
-- REALTIME — make sure every table the admin/app watch is published.
-- -----------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.modifiers;          exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.receipt_lines;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.expense_categories; exception when duplicate_object then null; end $$;


-- =============================================================================
-- VERIFY (run individually — read-only)
-- =============================================================================
-- Menu order as the backend now sees it:
--   select code, name from public.items order by sort_key;
--   select name from public.categories order by sort_key;
--   select name from public.expense_categories order by sort_key;
--
-- Modifier order (what the app shows top → bottom):
--   select sort_order, name from public.modifiers order by sort_order;
--
-- Receipts that still have no line items (created before this fix; the app
-- re-sends the lines automatically when it still has that sale cached):
--   select r.number, r.created_at, r.total
--     from public.receipts r
--    where not exists (select 1 from public.receipt_lines l where l.receipt_id = r.id)
--    order by r.created_at desc;
--
-- Discount check — gross, discounts (ticket + per-item) and total per receipt:
--   select r.number,
--          r.subtotal                                                       as gross,
--          r.discount + coalesce(sum(coalesce(l.base_total, l.line_total) - l.line_total), 0) as discounts,
--          r.total
--     from public.receipts r
--     left join public.receipt_lines l on l.receipt_id = r.id
--    where r.status <> 'cancelled'
--    group by r.id
--    order by r.created_at desc;
-- =============================================================================
