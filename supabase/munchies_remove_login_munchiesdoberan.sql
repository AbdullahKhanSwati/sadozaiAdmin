-- =============================================================================
-- MUNCHIES — remove the login munchiesdoberan@gmail.com so it can be created
-- again as a STAFF login.
--
-- Run in the MUNCHIES Supabase project → SQL Editor → New query → Run.
-- Do NOT be signed in to the admin / app with this email while you do it.
--
-- What it removes : the login (auth.users) and, with it, its access-role row
--                   (profiles), sessions and identities (they cascade).
-- What it keeps   : every order, expense and stock count; the employee row on
--                   the Employees page stays (its login link is just cleared),
--                   so old receipts keep showing that employee's name.
-- =============================================================================

-- 1) BEFORE — what exists for this email (read-only).
select u.id, u.email, u.created_at, p.role as login_role
  from auth.users u
  left join public.profiles p on p.user_id = u.id
 where lower(u.email) = lower('munchiesdoberan@gmail.com');

-- 2) Remove the login.
delete from auth.users
 where lower(email) = lower('munchiesdoberan@gmail.com');

-- 3) AFTER — must return 0 rows in both.
select 'auth.users' as tbl, count(*) as rows_left
  from auth.users where lower(email) = lower('munchiesdoberan@gmail.com')
union all
select 'profiles', count(*)
  from public.profiles where lower(email) = lower('munchiesdoberan@gmail.com');

-- =============================================================================
-- NEXT — create it again as STAFF:
--   Supabase → Authentication → Users → Add user → Create new user
--   email munchiesdoberan@gmail.com, a password, tick "Auto Confirm User".
--   New logins are created as 'staff' (only the very first login was admin).
--   To be sure, run afterwards:
--     update public.profiles set role = 'staff'
--      where lower(email) = lower('munchiesdoberan@gmail.com');
--   Then on the admin's Employees page, edit "Munchies" and keep Role = Staff.
-- =============================================================================
