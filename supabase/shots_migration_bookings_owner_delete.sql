-- =============================================================================
-- SHOTS — migration: permanent booking delete (Owner only) + player counts
--
-- Run in the SHOTS Supabase project → SQL Editor → New query → Run.
-- Safe to re-run. Requires shots_migration_staff_logins.sql (for the profile
-- roles). Deletes NO data by itself.
--
-- 1) PERMANENT DELETE — OWNER ONLY
--    Until now the bookings table had one "tenant" policy FOR ALL, so any
--    signed-in user of the business (staff too, through the API) could delete
--    a booking. Now:
--      read / add / edit  → anyone in the business (app + admin), unchanged
--      delete             → only a user whose profile role is 'Owner'
--    The app never deletes — it CANCELS (status = 'Cancelled', record kept).
--    The admin's "Delete permanently" button calls owner_delete_booking().
--
-- 2) PLAYER COUNTS
--    Older app builds saved players = number of MEMBERS on the booking, so a
--    walk-in for 2 players was stored as 1. The app is fixed; this raises the
--    count on member bookings that list more members than players. (Walk-in
--    bookings can't be corrected automatically — edit them if needed.)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Is the caller the Owner of their business?
-- -----------------------------------------------------------------------------
create or replace function public.shots_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select lower(p.role) = 'owner' from public.profiles p where p.user_id = auth.uid()),
    false
  );
$$;
revoke all on function public.shots_is_owner() from public, anon;
grant execute on function public.shots_is_owner() to authenticated;


-- -----------------------------------------------------------------------------
-- 1) Split the bookings policy: delete is Owner-only
-- -----------------------------------------------------------------------------
alter table public.bookings enable row level security;

-- Old FOR ALL policies (names used by setup.sql and by schema.sql).
drop policy if exists bookings_tenant   on public.bookings;
drop policy if exists "tenant access"   on public.bookings;

drop policy if exists bookings_select on public.bookings;
create policy bookings_select on public.bookings
  for select to authenticated
  using (business_id = public.current_business_id());

drop policy if exists bookings_insert on public.bookings;
create policy bookings_insert on public.bookings
  for insert to authenticated
  with check (business_id = public.current_business_id());

drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

drop policy if exists bookings_delete_owner on public.bookings;
create policy bookings_delete_owner on public.bookings
  for delete to authenticated
  using (business_id = public.current_business_id() and public.shots_is_owner());


-- Clear error message for the admin button (RLS alone would silently delete 0 rows).
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
    raise exception 'Only the Owner can permanently delete bookings. Cancel the booking instead.';
  end if;
  delete from public.bookings where id = p_id and business_id = v_business;
  if not found then
    raise exception 'Booking not found (it may already be deleted).';
  end if;
end;
$$;
revoke all on function public.owner_delete_booking(bigint) from public, anon;
grant execute on function public.owner_delete_booking(bigint) to authenticated;


-- -----------------------------------------------------------------------------
-- 2) Player counts on member bookings
-- -----------------------------------------------------------------------------
update public.bookings
   set players = jsonb_array_length(members)
 where jsonb_typeof(members) = 'array'
   and jsonb_array_length(members) > coalesce(players, 0);


-- =============================================================================
-- VERIFY (read-only)
--   Policies on bookings (delete must be bookings_delete_owner only):
--     select policyname, cmd from pg_policies where tablename = 'bookings';
--   Who is Owner:
--     select email, role from public.profiles order by role;
--
-- Make someone the Owner (only if needed):
--   update public.profiles set role = 'Owner' where email = 'owner@example.com';
-- =============================================================================
