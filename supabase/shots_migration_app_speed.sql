-- =============================================================================
-- SHOTS — migration: faster app (dashboard totals for long periods)
--
-- Run in the SHOTS Supabase project → SQL Editor → New query → Run.
-- Safe to re-run. Changes NO data.
--
-- The app no longer downloads every booking and transaction ever made on each
-- sync (that made the menu and screens hang). It keeps the last 13 months (+
-- future bookings); for "This Year" / "All Time" on the Dashboard it asks the
-- server for the totals with this function. Only the caller's own business.
-- =============================================================================

create or replace function public.shots_period_totals(p_from date default null, p_to date default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'bookingRevenue',    coalesce((select sum(b.amount) from public.bookings b
                                    where b.business_id = public.current_business_id()
                                      and coalesce(b.status, 'Active') <> 'Cancelled'
                                      and (p_from is null or b.date >= p_from)
                                      and (p_to   is null or b.date <= p_to)), 0),
    'membershipRevenue', coalesce((select sum(t.amount) from public.transactions t
                                    where t.business_id = public.current_business_id()
                                      and t.type = 'In' and t.category = 'Membership'
                                      and (p_from is null or t.date >= p_from)
                                      and (p_to   is null or t.date <= p_to)), 0),
    'expenses',          coalesce((select sum(t.amount) from public.transactions t
                                    where t.business_id = public.current_business_id()
                                      and t.type = 'Out'
                                      and (p_from is null or t.date >= p_from)
                                      and (p_to   is null or t.date <= p_to)), 0)
  );
$$;
revoke all on function public.shots_period_totals(date, date) from public, anon;
grant execute on function public.shots_period_totals(date, date) to authenticated;

create index if not exists bookings_business_date_idx on public.bookings (business_id, date);
create index if not exists transactions_business_date_idx on public.transactions (business_id, date);
-- =============================================================================
