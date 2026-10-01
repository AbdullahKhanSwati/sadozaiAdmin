-- =============================================================================
-- MUNCHIES — migration v7: "Owner" on the Employees page counts as Owner
--
-- Run AFTER munchies_migration_v6.sql, in the MUNCHIES Supabase project →
-- SQL Editor → New query → Run. Re-runnable; changes no data.
--
-- Permanent order delete is OWNER-only (v6). Until now it only read the login's
-- access role (profiles.role), which every first login has as 'admin', so an
-- employee set to "Owner" on the admin's Employees page still could not delete.
-- Now EITHER of these makes you the Owner:
--   * profiles.role = 'owner', or
--   * your employee row (matched by login id or email) has the Owner role.
-- Admin and Staff employees still cannot delete — they can only cancel.
-- =============================================================================

create or replace function public.munchies_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null and (
    coalesce((select lower(role) = 'owner' from public.profiles where user_id = auth.uid()), false)
    or exists (
      select 1
        from public.employees e
        join public.roles r on r.id = e.role_id
       where (r.id = 'r-owner' or lower(btrim(r.name)) = 'owner')
         and (e.user_id = auth.uid()
              or (coalesce(btrim(e.email), '') <> ''
                  and lower(btrim(e.email)) = (select lower(u.email) from auth.users u where u.id = auth.uid())))
    )
  );
$$;
revoke all on function public.munchies_is_owner() from public, anon;
grant execute on function public.munchies_is_owner() to authenticated;

-- =============================================================================
-- CHECK (read-only) — who counts as Owner:
--   select u.email, p.role as login_role, r.name as employees_page_role
--     from auth.users u
--     left join public.profiles  p on p.user_id = u.id
--     left join public.employees e on e.user_id = u.id or lower(btrim(e.email)) = lower(u.email)
--     left join public.roles     r on r.id = e.role_id
--    order by 1;
-- =============================================================================
