-- ============================================================================
-- admin_set_staff_role
-- ----------------------------------------------------------------------------
-- Lets an admin set a staff member's ROLE in `profiles`. The app reads
-- profiles.role to decide who can see the Dashboard (admin/owner only), so the
-- role must be written there — which the browser can't do directly because of
-- the "profiles update own" RLS policy. This guarded SECURITY DEFINER function
-- does it safely.
--
-- Guards:
--   * caller must be signed in AND be an admin/owner (prevents staff from
--     escalating their own role)
--   * target must belong to the SAME business as the caller
--
-- Run this ONCE in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- ============================================================================

create or replace function public.admin_set_staff_role(
  target_email text,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_business  text;
  caller_role      text;
  target_user_id   uuid;
  target_business  text;
begin
  if new_role is null or length(trim(new_role)) = 0 then
    raise exception 'Role is required.';
  end if;

  -- Caller must be signed in and be an admin/owner.
  select p.business_id::text, p.role
    into caller_business, caller_role
  from public.profiles p
  where p.user_id = auth.uid();

  if caller_business is null then
    raise exception 'Not authorized.';
  end if;
  if lower(coalesce(caller_role, '')) not in ('owner', 'admin') then
    raise exception 'Only admins can change roles.';
  end if;

  -- Find the target login by email.
  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(trim(target_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No login found for %.', target_email;
  end if;

  -- Target must be in the caller's business.
  select p.business_id::text into target_business
  from public.profiles p
  where p.user_id = target_user_id;

  if target_business is distinct from caller_business then
    raise exception 'Not authorized to manage this user.';
  end if;

  update public.profiles set role = trim(new_role) where user_id = target_user_id;
end;
$$;

revoke all on function public.admin_set_staff_role(text, text) from public;
revoke all on function public.admin_set_staff_role(text, text) from anon;
grant execute on function public.admin_set_staff_role(text, text) to authenticated;
