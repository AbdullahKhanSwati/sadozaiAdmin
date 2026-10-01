-- =============================================================================
-- SHOTS — permanent booking delete from the ADMIN PANEL (admin + owner logins)
--
-- Run AFTER shots_migration_bookings_owner_delete.sql, in the SHOTS Supabase
-- project → SQL Editor → New query → Run. Re-runnable; changes no data.
--
-- Before: only a login with role 'owner' could delete a booking permanently.
-- Now:    every login that can open the admin panel (role 'admin' or 'owner')
--         can. Staff (app-only logins) still cannot — in the app a booking is
--         only CANCELLED, so its record is kept.
--
-- shots_is_owner() is what the bookings delete policy and owner_delete_booking()
-- check, so redefining it is all that is needed.
-- =============================================================================

create or replace function public.shots_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select lower(p.role) in ('admin', 'owner') from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;
revoke all on function public.shots_is_owner() from public, anon;
grant execute on function public.shots_is_owner() to authenticated;

create or replace function public.owner_delete_booking(p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business text := public.current_business_id();
begin
  if v_business is null then
    raise exception 'Not authorized.';
  end if;
  if not public.shots_is_owner() then
    raise exception 'Only the admin panel can permanently delete bookings. Cancel the booking instead.';
  end if;
  delete from public.bookings where id = p_id and business_id = v_business;
  if not found then
    raise exception 'Booking not found (it may already be deleted).';
  end if;
end;
$$;
revoke all on function public.owner_delete_booking(bigint) from public, anon;
grant execute on function public.owner_delete_booking(bigint) to authenticated;
-- =============================================================================
