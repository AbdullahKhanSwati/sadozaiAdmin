-- ============================================================================
-- admin_set_staff_password
-- ----------------------------------------------------------------------------
-- Lets a signed-in admin set a staff member's APP LOGIN password from the admin
-- panel. The browser can't do this with the anon key (changing another user's
-- password needs elevated rights), so we expose a tightly-scoped SECURITY
-- DEFINER function instead.
--
-- Guard: the function only works when the CALLER belongs to the SAME business
-- as the target staff member. Execute is granted to `authenticated` only.
--
-- Run this ONCE in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- ============================================================================

-- pgcrypto provides crypt()/gen_salt(); it ships with Supabase in `extensions`.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_set_staff_password(
  target_email text,
  new_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  caller_business  text;
  target_user_id   uuid;
  target_business  text;
begin
  -- Basic validation.
  if new_password is null or length(new_password) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  -- The caller must be signed in and have a profile (i.e. belong to a business).
  select p.business_id::text into caller_business
  from public.profiles p
  where p.user_id = auth.uid();

  if caller_business is null then
    raise exception 'Not authorized.';
  end if;

  -- Find the target login by email.
  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(trim(target_email))
  limit 1;

  if target_user_id is null then
    raise exception 'No login found for %.', target_email;
  end if;

  -- The target must belong to the caller's business.
  select p.business_id::text into target_business
  from public.profiles p
  where p.user_id = target_user_id;

  if target_business is distinct from caller_business then
    raise exception 'Not authorized to manage this user.';
  end if;

  -- Set the new password (bcrypt hash, as GoTrue / Supabase Auth expects).
  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;
end;
$$;

-- Lock it down: only authenticated users can call it (the guard above does the
-- real authorization). Never expose to anon.
revoke all on function public.admin_set_staff_password(text, text) from public;
revoke all on function public.admin_set_staff_password(text, text) from anon;
grant execute on function public.admin_set_staff_password(text, text) to authenticated;
