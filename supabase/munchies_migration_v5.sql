-- =============================================================================
-- MUNCHIES — migration v5: stock checker ordering (admin drag-and-drop → app)
--
--   * Every stock category and stock item gets a distinct 1-based sort_order
--     (current visual order preserved; never-ordered rows keep their place at
--     the end, alphabetically).
--   * munchies_reorder_stock_categories(ids[]) / munchies_reorder_stock_items(ids[])
--     store a whole new order in one statement (admins only) — the admin's
--     Stock → "Items & categories" tab calls them when you drag a row.
--   * The app's stock checker and both Excel exports follow this order.
--
-- Run in the MUNCHIES Supabase project → SQL Editor → New query → Run.
-- Safe to re-run. Requires munchies_migration_stock_items.sql. Deletes nothing.
-- =============================================================================

-- 1) Distinct positions ---------------------------------------------------------
with ranked as (
  select id,
         row_number() over (
           order by case when coalesce(sort_order, 0) <= 0 then 1 else 0 end,  -- unordered → last
                    sort_order, name, created_at, id
         ) as rn
    from public.stock_categories
)
update public.stock_categories c set sort_order = ranked.rn from ranked where ranked.id = c.id;

with ranked as (
  select id,
         row_number() over (
           order by case when coalesce(sort_order, 0) <= 0 then 1 else 0 end,
                    sort_order, name, created_at, id
         ) as rn
    from public.stock_items
)
update public.stock_items i set sort_order = ranked.rn from ranked where ranked.id = i.id;

-- 2) Reorder RPCs ------------------------------------------------------------------
create or replace function public.munchies_reorder_stock_categories(p_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reorder stock categories.';
  end if;
  update public.stock_categories c
     set sort_order = x.ord
    from unnest(p_ids) with ordinality as x(id, ord)
   where c.id = x.id;
end;
$$;
revoke all on function public.munchies_reorder_stock_categories(text[]) from public, anon;
grant execute on function public.munchies_reorder_stock_categories(text[]) to authenticated;

create or replace function public.munchies_reorder_stock_items(p_ids text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reorder stock items.';
  end if;
  update public.stock_items i
     set sort_order = x.ord
    from unnest(p_ids) with ordinality as x(id, ord)
   where i.id = x.id;
end;
$$;
revoke all on function public.munchies_reorder_stock_items(text[]) from public, anon;
grant execute on function public.munchies_reorder_stock_items(text[]) to authenticated;

-- 3) New rows added from the app land at the END of the list (not at the top).
create or replace function public.munchies_stock_next_position()
returns trigger
language plpgsql
as $$
begin
  if new.sort_order is null or new.sort_order <= 0 then
    if tg_table_name = 'stock_categories' then
      select coalesce(max(sort_order), 0) + 1 into new.sort_order from public.stock_categories;
    else
      select coalesce(max(sort_order), 0) + 1 into new.sort_order from public.stock_items;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists stock_categories_position on public.stock_categories;
create trigger stock_categories_position before insert on public.stock_categories
  for each row execute function public.munchies_stock_next_position();
drop trigger if exists stock_items_position on public.stock_items;
create trigger stock_items_position before insert on public.stock_items
  for each row execute function public.munchies_stock_next_position();

-- Realtime (already published by the stock migrations; harmless to repeat).
do $$ begin alter publication supabase_realtime add table public.stock_categories; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.stock_items;      exception when duplicate_object then null; end $$;

-- =============================================================================
-- VERIFY (read-only)
--   select sort_order, name from public.stock_categories order by sort_order;
--   select i.sort_order, c.name as category, i.name
--     from public.stock_items i left join public.stock_categories c on c.id = i.category_id
--    order by c.sort_order nulls last, i.sort_order;
-- =============================================================================
