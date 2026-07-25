-- =============================================================================
-- MUNCHIES — migration: make Receipt + Dining settings persist
-- business_settings previously only had `features`. Add the columns the admin
-- Settings page writes, so Receipt + Dining options actually save (and the app
-- can read them). Run in the Munchies Supabase project. Safe to re-run.
-- =============================================================================

alter table public.business_settings add column if not exists receipt jsonb not null default '{}'::jsonb;
alter table public.business_settings add column if not exists dining  jsonb not null default '[]'::jsonb;

-- Ensure the single settings row exists.
insert into public.business_settings (id) values (1) on conflict (id) do nothing;

-- Seed default dining options if none set yet.
update public.business_settings
  set dining = '[{"name":"Eat In","enabled":true},{"name":"Take Away","enabled":true},{"name":"Delivery","enabled":true}]'::jsonb
  where id = 1 and (dining is null or dining = '[]'::jsonb);

-- Seed a default receipt header/footer if empty.
update public.business_settings
  set receipt = '{"header":"Doberan Kallan","phone":"03295789178","footer":"Thank you for your visit!"}'::jsonb
  where id = 1 and (receipt is null or receipt = '{}'::jsonb);

-- Realtime so the app picks up settings changes.
do $$ begin alter publication supabase_realtime add table public.business_settings; exception when duplicate_object then null; end $$;
