-- =============================================================================
-- SHOTS — migration: staff logins that actually work (create / delete / revoke)
--
-- Run in the SHOTS Supabase project → SQL Editor → New query → Run.
-- Safe to re-run. Deletes NO business data (members, bookings, transactions …).
--
-- WHAT WAS WRONG
--   * The admin created staff logins with auth.signUp(). The Shots project has no
--     handle_new_user trigger, so the new login got NO profiles row → it had no
--     business, and admin_set_staff_role() failed ("Not authorized …").
--     signUp is also rate-limited by Supabase (a few sign-ups per hour).
--   * profiles.user_id → auth.users had no ON DELETE CASCADE, so a login could
--     not be deleted (foreign-key error), and "Remove" in the admin only deleted
--     the staff row — the person could still sign in to the app.
--
-- WHAT THIS ADDS
--   1. profiles → auth.users ON DELETE CASCADE.
--   2. handle_new_user trigger (safety net for users added in the dashboard):
--      always gives the user a profile in the 'shots' business as 'Staff'
--      (the very first user becomes 'Owner'). Sign-up metadata is NOT trusted
--      for the role.
--   3. Backfill: every existing login without a profile gets one (role taken
--      from the staff list when the email matches, else 'Staff').
--   4. admin_create_staff(email, password, name, role)
--      Creates the login + profile + staff row in ONE transaction, no signUp,
--      no email confirmation, no rate limit. Admin / Owner only.
--   5. admin_delete_staff(email, staff_id)
--      Deletes the login (profile + sessions go with it) and the staff row.
--      The app is signed out: its refresh token stops working immediately and
--      RLS returns nothing for a user without a profile.
--   6. admin_set_staff_password / admin_set_staff_role now require the caller
--      to be an Admin / Owner of the same business (previously ANY signed-in
--      user of the business could reset another user's password).
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;


-- -----------------------------------------------------------------------------
-- 1) profiles.user_id → auth.users : ON DELETE CASCADE
-- -----------------------------------------------------------------------------
do $$
declare c text;
begin
  -- Drop whatever FK(s) currently tie profiles.user_id to auth.users …
  for c in
    select con.conname
      from pg_constraint con
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
     where con.conrelid = 'public.profiles'::regclass
       and con.contype = 'f'
       and con.confrelid = 'auth.users'::regclass
       and att.attname = 'user_id'
  loop
    execute format('alter table public.profiles drop constraint %I', c);
  end loop;
  -- … and add it back with cascade.
  alter table public.profiles
    add constraint profiles_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
end $$;


-- -----------------------------------------------------------------------------
-- 2) Auto-profile for new logins (safety net)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first boolean;
begin
  select not exists (select 1 from public.profiles) into v_first;
  insert into public.profiles (user_id, business_id, email, name, role)
  values (
    new.id,
    'shots',
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'name', ''), 'Staff'),
    case when v_first then 'Owner' else 'Staff' end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 3) Backfill profiles for logins that were created without one
-- -----------------------------------------------------------------------------
insert into public.profiles (user_id, business_id, email, name, role)
select u.id,
       'shots',
       u.email,
       coalesce(s.name, nullif(u.raw_user_meta_data->>'name', ''), 'Staff'),
       coalesce(nullif(s.role, ''), 'Staff')
  from auth.users u
  left join lateral (
    select st.name, st.role
      from public.staff st
     where lower(st.email) = lower(u.email)
     order by st.created_at desc
     limit 1
  ) s on true
 where not exists (select 1 from public.profiles p where p.user_id = u.id);


-- -----------------------------------------------------------------------------
-- Helper: the caller's business, but only if the caller is an Admin / Owner.
-- -----------------------------------------------------------------------------
create or replace function public.shots_admin_business()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business text;
  v_role     text;
begin
  select p.business_id, p.role into v_business, v_role
    from public.profiles p
   where p.user_id = auth.uid();
  if v_business is null then
    raise exception 'Not authorized.';
  end if;
  if lower(coalesce(v_role, '')) not in ('owner', 'admin') then
    raise exception 'Only admins can manage staff logins.';
  end if;
  return v_business;
end;
$$;
revoke all on function public.shots_admin_business() from public, anon;
grant execute on function public.shots_admin_business() to authenticated;


-- -----------------------------------------------------------------------------
-- 4) admin_create_staff — login + profile + staff row, one transaction
--    Returns { user_id, staff_id, already_existed }.
--    If the email already has a login in THIS business, its password, name and
--    role are updated (handy for re-adding someone). A login that belongs to a
--    different business is refused.
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_staff(
  p_email    text,
  p_password text,
  p_name     text default null,
  p_role     text default 'Staff'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_business text := public.shots_admin_business();
  v_email    text := lower(trim(coalesce(p_email, '')));
  v_name     text := coalesce(nullif(trim(p_name), ''), 'Staff');
  v_role     text := initcap(lower(trim(coalesce(p_role, 'Staff'))));
  v_uid      uuid;
  v_existing boolean := false;
  v_other    text;
  v_staff_id bigint;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Enter a valid email address.';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;
  if v_role not in ('Admin', 'Staff') then
    raise exception 'Role must be Admin or Staff.';
  end if;

  select id into v_uid from auth.users where lower(email) = v_email limit 1;

  if v_uid is not null then
    select business_id into v_other from public.profiles where user_id = v_uid;
    if v_other is not null and v_other <> v_business then
      raise exception 'This email is already used by another business.';
    end if;
    v_existing := true;
    update auth.users
       set encrypted_password = crypt(p_password, gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           updated_at = now()
     where id = v_uid;
  else
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
      v_email, crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_name),
      now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, v_uid::text, 'email',
      jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  end if;

  -- Profile: ties the login to the business + sets the app role.
  insert into public.profiles (user_id, business_id, email, name, role)
  values (v_uid, v_business, v_email, v_name, v_role)
  on conflict (user_id) do update
    set business_id = excluded.business_id,
        email       = excluded.email,
        name        = excluded.name,
        role        = excluded.role;

  -- Staff row (what the admin's Staff page lists).
  select id into v_staff_id
    from public.staff
   where business_id = v_business and lower(email) = v_email
   order by created_at
   limit 1;
  if v_staff_id is null then
    insert into public.staff (business_id, name, role, email, status, joined_at)
    values (v_business, v_name, v_role, v_email, 'Active', current_date)
    returning id into v_staff_id;
  else
    update public.staff
       set name = v_name, role = v_role, status = 'Active'
     where id = v_staff_id;
  end if;

  return jsonb_build_object('user_id', v_uid, 'staff_id', v_staff_id, 'already_existed', v_existing);
end;
$$;
revoke all on function public.admin_create_staff(text, text, text, text) from public, anon;
grant execute on function public.admin_create_staff(text, text, text, text) to authenticated;


-- -----------------------------------------------------------------------------
-- 5) admin_delete_staff — remove the login AND the staff row
--    p_staff_id lets the admin remove a staff row that has no email.
-- -----------------------------------------------------------------------------
drop function if exists public.admin_delete_staff(text);
drop function if exists public.admin_delete_staff(text, bigint);

create or replace function public.admin_delete_staff(
  p_email    text,
  p_staff_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business text := public.shots_admin_business();
  v_email    text := lower(trim(coalesce(p_email, '')));
  v_uid      uuid;
  v_other    text;
begin
  -- Only an id given → use that staff row's email, so its login goes too.
  if v_email = '' and p_staff_id is not null then
    select lower(trim(coalesce(email, ''))) into v_email
      from public.staff where id = p_staff_id and business_id = v_business;
    v_email := coalesce(v_email, '');
  end if;

  if v_email <> '' then
    select id into v_uid from auth.users where lower(email) = v_email limit 1;
  end if;

  if v_uid is not null then
    if v_uid = auth.uid() then
      raise exception 'You cannot delete your own login.';
    end if;
    select business_id into v_other from public.profiles where user_id = v_uid;
    if v_other is not null and v_other <> v_business then
      raise exception 'Not authorized to manage this user.';
    end if;
    -- Cascades to profiles, identities, sessions and refresh tokens → the app
    -- can no longer refresh its session and is signed out.
    delete from auth.users where id = v_uid;
  end if;

  delete from public.staff
   where business_id = v_business
     and ((v_email <> '' and lower(email) = v_email) or id = p_staff_id);
end;
$$;
revoke all on function public.admin_delete_staff(text, bigint) from public, anon;
grant execute on function public.admin_delete_staff(text, bigint) to authenticated;


-- -----------------------------------------------------------------------------
-- 6) Password + role — Admin / Owner of the same business only
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_staff_password(target_email text, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_business text := public.shots_admin_business();
  v_uid      uuid;
  v_other    text;
begin
  if new_password is null or length(new_password) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(target_email)) limit 1;
  if v_uid is null then
    raise exception 'No login found for %.', target_email;
  end if;
  select business_id into v_other from public.profiles where user_id = v_uid;
  if v_other is distinct from v_business then
    raise exception 'Not authorized to manage this user.';
  end if;
  update auth.users
     set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
   where id = v_uid;
end;
$$;
revoke all on function public.admin_set_staff_password(text, text) from public, anon;
grant execute on function public.admin_set_staff_password(text, text) to authenticated;

create or replace function public.admin_set_staff_role(target_email text, new_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_business text := public.shots_admin_business();
  v_role     text := initcap(lower(trim(coalesce(new_role, ''))));
  v_uid      uuid;
  v_other    text;
begin
  if v_role not in ('Admin', 'Staff', 'Owner') then
    raise exception 'Role must be Admin or Staff.';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(target_email)) limit 1;
  if v_uid is null then
    raise exception 'No login found for %.', target_email;
  end if;
  if v_uid = auth.uid() and v_role = 'Staff' then
    raise exception 'You cannot remove your own admin access.';
  end if;
  select business_id into v_other from public.profiles where user_id = v_uid;
  if v_other is distinct from v_business then
    raise exception 'Not authorized to manage this user.';
  end if;
  update public.profiles set role = v_role where user_id = v_uid;
  update public.staff set role = v_role
   where business_id = v_business and lower(email) = lower(trim(target_email));
end;
$$;
revoke all on function public.admin_set_staff_role(text, text) from public, anon;
grant execute on function public.admin_set_staff_role(text, text) to authenticated;


-- -----------------------------------------------------------------------------
-- Realtime for the staff list (admin refreshes live).
-- -----------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.staff;
exception when duplicate_object then null; end $$;


-- =============================================================================
-- VERIFY (read-only)
--   Every login has a profile + business:
--     select u.email, p.business_id, p.role
--       from auth.users u left join public.profiles p on p.user_id = u.id
--      order by u.created_at;
--
--   Staff rows whose login is missing (can be removed from the admin):
--     select s.name, s.email from public.staff s
--      where s.email is not null
--        and not exists (select 1 from auth.users u where lower(u.email) = lower(s.email));
--
-- RECOMMENDED (Dashboard, not SQL): Authentication → Sign In / Providers →
-- turn OFF "Allow new users to sign up". Staff are now created by the admin
-- panel through admin_create_staff(), so public sign-up is not needed.
-- =============================================================================
