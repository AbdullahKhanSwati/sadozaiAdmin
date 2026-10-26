-- =============================================================================
-- MUNCHIES — migration v8: dashboard totals for long periods (app speed-up)
--
-- Run in the MUNCHIES Supabase project → SQL Editor → New query → Run.
-- Safe to re-run. Changes no data.
--
-- The app no longer downloads the whole sales history on every sync (that is
-- what made the menu and screens hang). It keeps the recent months on the
-- phone; for "This Year" / "All Time" on the Dashboard it asks the server for
-- the totals with this function instead.
-- =============================================================================

create or replace function public.munchies_period_totals(p_from date default null, p_to date default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'sales',    coalesce((select sum(r.total)
                            from public.receipts r
                           where coalesce(r.status, 'completed') <> 'cancelled'
                             and (p_from is null or (r.created_at at time zone 'Asia/Karachi')::date >= p_from)
                             and (p_to   is null or (r.created_at at time zone 'Asia/Karachi')::date <= p_to)), 0),
    'receipts', coalesce((select count(*)
                            from public.receipts r
                           where coalesce(r.status, 'completed') <> 'cancelled'
                             and (p_from is null or (r.created_at at time zone 'Asia/Karachi')::date >= p_from)
                             and (p_to   is null or (r.created_at at time zone 'Asia/Karachi')::date <= p_to)), 0),
    'spent',    coalesce((select sum(e.amount)
                            from public.expenses e
                           where (p_from is null or e.spent_on >= p_from)
                             and (p_to   is null or e.spent_on <= p_to)), 0)
  );
$$;
revoke all on function public.munchies_period_totals(date, date) from public, anon;
grant execute on function public.munchies_period_totals(date, date) to authenticated;

-- Speeds up "receipts since date X" (what the app now asks for).
create index if not exists receipts_created_idx on public.receipts (created_at);
-- =============================================================================
