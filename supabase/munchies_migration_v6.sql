-- =============================================================================
-- MUNCHIES — migration v6: permanent order delete (OWNER only)
--
-- Run in the MUNCHIES Supabase project → SQL Editor → New query → Run.
-- Safe to re-run. Requires munchies_schema.sql … munchies_migration_v5.sql.
-- Deletes NO data by itself.
--
-- WHY
--   receipts / receipt_lines had one "auth all" policy (FOR ALL), so any
--   signed-in user — staff included, through the API — could delete orders.
--   Now:
--     read / add / edit (incl. cancel + restore) → any signed-in user, unchanged
--     permanent delete                           → only role 'owner'
--   The admin's "Delete permanently" button calls munchies_owner_delete_order(),
--   which removes the receipt and its lines (receipt_lines cascade).
--   Cancelling stays the normal way to void an order (record kept).
--
-- WHO IS OWNER?
--   The first Munchies login was created as 'admin'. To give yourself the
--   Owner permission run (with your email):
--     update public.profiles set role = 'owner' where lower(email) = lower('you@example.com');
--   Owners keep full admin access (is_admin() already includes 'owner').
-- =============================================================================


-- Is the caller the Owner? SECURITY DEFINER to read profiles past RLS.
create or replace function public.munchies_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select lower(role) = 'owner' from public.profiles where user_id = auth.uid()),
    false
  );
$$;
revoke all on function public.munchies_is_owner() from public, anon;
grant execute on function public.munchies_is_owner() to authenticated;


-- Split the FOR ALL policies: delete is Owner-only.
do $$
declare t text;
begin
  foreach t in array array['receipts', 'receipt_lines'] loop
    execute format('drop policy if exists "auth all" on public.%I;', t);

    execute format('drop policy if exists "auth read" on public.%I;', t);
    execute format('create policy "auth read" on public.%I for select to authenticated using (true);', t);

    execute format('drop policy if exists "auth insert" on public.%I;', t);
    execute format('create policy "auth insert" on public.%I for insert to authenticated with check (true);', t);

    execute format('drop policy if exists "auth update" on public.%I;', t);
    execute format('create policy "auth update" on public.%I for update to authenticated using (true) with check (true);', t);

    execute format('drop policy if exists "owner delete" on public.%I;', t);
    execute format('create policy "owner delete" on public.%I for delete to authenticated using (public.munchies_is_owner());', t);
  end loop;
end $$;


-- The admin button: clear error messages instead of a silent "0 rows deleted".
create or replace function public.munchies_owner_delete_order(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.munchies_is_owner() then
    raise exception 'Only the Owner can permanently delete orders. Cancel the order instead.';
  end if;
  delete from public.receipts where id = p_id;   -- receipt_lines go with it (on delete cascade)
  if not found then
    raise exception 'Order not found (it may already be deleted).';
  end if;
end;
$$;
revoke all on function public.munchies_owner_delete_order(text) from public, anon;
grant execute on function public.munchies_owner_delete_order(text) to authenticated;


-- =============================================================================
-- VERIFY (read-only)
--   Policies (delete must be "owner delete" only):
--     select tablename, policyname, cmd from pg_policies
--      where tablename in ('receipts', 'receipt_lines') order by 1, 3;
--   Who is Owner:
--     select email, role from public.profiles order by role;
-- =============================================================================
