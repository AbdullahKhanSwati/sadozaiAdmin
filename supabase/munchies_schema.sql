-- =============================================================================
-- MUNCHIES — Supabase schema (dedicated project, separate from Shots)
-- Paste this whole file into: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT / CREATE OR REPLACE).
--
-- ACCESS MODEL (two user types):
--   * admin  → can sign in to the ADMIN PANEL and the MUNCHIES APP
--   * staff  → can sign in to the MUNCHIES APP only (no admin panel, no app dashboard)
--   Enforced by: profiles.role + is_admin() + RLS. The admin login also checks
--   the role client-side and refuses staff.
--
--   The FIRST user to sign up becomes 'admin' automatically; everyone created
--   afterwards defaults to 'staff' unless the signup metadata says otherwise.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. PROFILES  (one row per auth user — holds the access role)
-- =============================================================================
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'staff',   -- 'admin' | 'staff'
  name       text default 'Employee',
  email      text,
  phone      text,
  created_at timestamptz default now()
);

-- Is the current signed-in user an admin? SECURITY DEFINER to bypass RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select lower(role) in ('admin', 'owner') from public.profiles where user_id = auth.uid()),
    false
  );
$$;

-- Auto-create a profile on signup. First user = admin; others take the role
-- from signup metadata ('admin'|'staff'), defaulting to 'staff'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  meta_role text;
begin
  select count(*) = 0 into is_first from public.profiles;
  meta_role := lower(coalesce(new.raw_user_meta_data->>'role', 'staff'));
  if meta_role not in ('admin', 'staff', 'owner') then
    meta_role := 'staff';
  end if;

  insert into public.profiles (user_id, role, email, name)
  values (
    new.id,
    case when is_first then 'admin' else meta_role end,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Employee')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. ROLES  (Access rights — Owner/Admin/Staff; access: 'both' | 'pos')
-- =============================================================================
create table if not exists public.roles (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  access     text not null default 'pos',     -- 'both' (admin) | 'pos' (staff/app only)
  color      text default '#00897B',
  system     boolean not null default false,  -- Owner can't be deleted
  created_at timestamptz default now()
);

-- =============================================================================
-- 3. EMPLOYEES  (Employee list — optional app login via user_id)
-- =============================================================================
create table if not exists public.employees (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  email      text,
  phone      text,
  role_id    text references public.roles(id) on delete set null,
  user_id    uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- =============================================================================
-- 4. CATEGORIES  (Items › Categories)
-- =============================================================================
create table if not exists public.categories (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  color      text default '#BDBDBD',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- =============================================================================
-- 5. MODIFIERS  (Items › Modifiers; options as JSON [{name, price}])
-- =============================================================================
create table if not exists public.modifiers (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  options    jsonb not null default '[]'::jsonb,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- =============================================================================
-- 6. ITEMS  (Items › Item list; modifiers = jsonb array of modifier ids)
-- =============================================================================
create table if not exists public.items (
  id                 text primary key default gen_random_uuid()::text,
  code               text,
  name               text not null,
  category_id        text references public.categories(id) on delete set null,
  price              numeric default 0,
  cost               numeric default 0,
  sku                text,
  barcode            text,
  description        text,
  available_for_sale boolean default true,
  sold_by            text default 'Each',      -- 'Each' | 'Weight/Volume'
  composite          boolean default false,
  track_stock        boolean default false,
  color              text default '#BDBDBD',
  shape              text default 'square',     -- square | circle | scalloped | hexagon
  modifiers          jsonb not null default '[]'::jsonb,
  image              text,
  created_at         timestamptz default now()
);
create index if not exists items_category_idx on public.items(category_id);

-- =============================================================================
-- 7. DISCOUNTS  (Items › Discounts; value null = entered at sale)
-- =============================================================================
create table if not exists public.discounts (
  id         text primary key default gen_random_uuid()::text,
  name       text not null,
  type       text not null default 'percent', -- 'percent' | 'amount'
  value      numeric,                          -- null → variable
  created_at timestamptz default now()
);

-- =============================================================================
-- 8. CUSTOMERS  (Customer base — app + admin both read/write)
-- =============================================================================
create table if not exists public.customers (
  id          text primary key default gen_random_uuid()::text,
  name        text,
  email       text,
  phone       text,
  address     text,
  city        text,
  region      text,
  postal_code text,
  country     text,
  note        text,
  first_visit text,
  last_visit  text,
  visits      int default 0,
  spent       numeric default 0,
  points      numeric default 0,
  created_at  timestamptz default now()
);

-- =============================================================================
-- 9. BUSINESS_SETTINGS  (Account + Settings › Features; single row id=1)
-- =============================================================================
create table if not exists public.business_settings (
  id            int primary key default 1,
  business_name text default 'Munchies',
  currency      text default 'Pakistani Rupee (PKR)',
  use_paise     boolean default true,
  timezone      text default '(UTC+05:00) Islamabad, Karachi',
  features      jsonb not null default '{}'::jsonb,   -- {shifts:false, kitchenPrinters:true, ...}
  updated_at    timestamptz default now(),
  constraint business_settings_single check (id = 1)
);

-- =============================================================================
-- 10. RECEIPTS + RECEIPT_LINES  (sales history — written by the POS app,
--     read by the admin reports. Empty until the app is live.)
-- =============================================================================
create table if not exists public.receipts (
  id          text primary key default gen_random_uuid()::text,
  number      text,
  type        text not null default 'Sale',   -- 'Sale' | 'Refund'
  employee_id text references public.employees(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  subtotal    numeric default 0,
  discount    numeric default 0,
  total       numeric default 0,
  dining      text,                             -- 'Eat In' | 'Takeaway' | 'Delivery'
  created_at  timestamptz default now()
);
create index if not exists receipts_created_idx on public.receipts(created_at);

create table if not exists public.receipt_lines (
  id         text primary key default gen_random_uuid()::text,
  receipt_id text not null references public.receipts(id) on delete cascade,
  item_id    text references public.items(id) on delete set null,
  code       text,
  name       text,
  qty        numeric default 1,
  unit       numeric default 0,
  line_total numeric default 0,
  modifiers  jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);
create index if not exists receipt_lines_receipt_idx on public.receipt_lines(receipt_id);

-- =============================================================================
-- ROW LEVEL SECURITY
--   Catalog/employees/roles/settings : read = any authenticated, write = admin.
--   Customers/receipts               : read+write = any authenticated (app writes).
--   Profiles                         : read/update own; admins read/update all.
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.roles             enable row level security;
alter table public.employees         enable row level security;
alter table public.categories        enable row level security;
alter table public.modifiers         enable row level security;
alter table public.items             enable row level security;
alter table public.discounts         enable row level security;
alter table public.customers         enable row level security;
alter table public.business_settings enable row level security;
alter table public.receipts          enable row level security;
alter table public.receipt_lines     enable row level security;

-- Profiles
drop policy if exists "profiles select" on public.profiles;
create policy "profiles select" on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "profiles update" on public.profiles;
create policy "profiles update" on public.profiles for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Admin-managed tables: read to all authenticated, write to admins only.
do $$
declare t text;
begin
  foreach t in array array[
    'roles','employees','categories','modifiers','items','discounts','business_settings'
  ]
  loop
    execute format('drop policy if exists "read all" on public.%I;', t);
    execute format('create policy "read all" on public.%I for select to authenticated using (true);', t);
    execute format('drop policy if exists "admin write" on public.%I;', t);
    execute format($f$
      create policy "admin write" on public.%I
        for all to authenticated
        using (public.is_admin())
        with check (public.is_admin());
    $f$, t);
  end loop;
end$$;

-- Customers + receipts: any authenticated user (app + admin).
do $$
declare t text;
begin
  foreach t in array array['customers','receipts','receipt_lines']
  loop
    execute format('drop policy if exists "auth all" on public.%I;', t);
    execute format($f$
      create policy "auth all" on public.%I
        for all to authenticated
        using (true) with check (true);
    $f$, t);
  end loop;
end$$;

-- =============================================================================
-- REALTIME — let the app/admin receive live changes.
-- =============================================================================
do $$ begin alter publication supabase_realtime add table public.items;      exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.categories; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.modifiers;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.discounts;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.customers;  exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.receipts;   exception when duplicate_object then null; end $$;

-- =============================================================================
-- SEED — roles, settings, and the starting menu (categories/modifiers/items/discounts)
-- =============================================================================
insert into public.roles (id, name, access, color, system) values
  ('r-owner', 'Owner', 'both', '#FB8C00', true),
  ('r-admin', 'Admin', 'both', '#8E24AA', false),
  ('r-staff', 'Staff', 'pos',  '#00897B', false)
on conflict (id) do nothing;

insert into public.business_settings (id, features) values
  (1, '{"shifts":false,"timeClock":false,"openTickets":false,"kitchenPrinters":true,"customerDisplays":true,"diningOptions":true,"lowStock":true,"negativeStock":true}'::jsonb)
on conflict (id) do nothing;

insert into public.categories (id, name, color, sort_order) values
  ('c1',  '1 Burgers',         '#F44336', 1),
  ('c19', '1.9 Fried Chicken', '#BDBDBD', 2),
  ('c2',  '2 Fries',           '#BDBDBD', 3),
  ('c22', '2.2 Drinks',        '#BDBDBD', 4),
  ('c25', '2.5 Sauces',        '#BDBDBD', 5),
  ('c3',  '3 Finger Food',     '#BDBDBD', 6),
  ('c4',  '4 Pizza',           '#BDBDBD', 7),
  ('c5',  '5 Paratha Rolls',   '#BDBDBD', 8),
  ('c6',  '6 Kebabs',          '#BDBDBD', 9)
on conflict (id) do nothing;

insert into public.modifiers (id, name, options, sort_order) values
  ('m1', 'Single/Double Burger', '[{"name":"Single","price":0},{"name":"Double","price":200}]'::jsonb, 1),
  ('m2', 'Salad/ Cheese',        '[{"name":"Add Cheese","price":50},{"name":"No Salad","price":0}]'::jsonb, 2),
  ('m3', 'Burger Sauce - Special','[{"name":"No Sauce","price":0},{"name":"Ketchup","price":0},{"name":"Mayo","price":0},{"name":"Special Sauce","price":0}]'::jsonb, 3),
  ('m4', 'Meal',                 '[{"name":"Meal With Fries + Coke","price":200},{"name":"Meal With Fries + Sprite","price":200},{"name":"Meal With Fries + Pepsi","price":200},{"name":"Meal With Fries + Miranda","price":200}]'::jsonb, 4),
  ('m5', 'Milkshake',            '[{"name":"Vanilla","price":0},{"name":"Strawberry","price":0},{"name":"Blueberry","price":0},{"name":"Chocolate","price":0},{"name":"Oreo","price":0}]'::jsonb, 5)
on conflict (id) do nothing;

insert into public.discounts (id, name, type, value) values
  ('d1', 'Managers Discount',  'amount',  null),
  ('d2', 'Family Discount',    'percent', 30),
  ('d3', 'Staff Food',         'percent', 100),
  ('d4', 'Residents Discount', 'percent', 10)
on conflict (id) do nothing;

-- Items (burgers carry the default modifier set).
insert into public.items (id, code, name, category_id, price, sku, modifiers) values
  ('i1',  '1.1',   'Crispy Burger',          'c1', 400, '10001', '["m1","m2","m3","m4"]'::jsonb),
  ('i2',  '1.2.1', 'Chicken Chapli Burger',  'c1', 450, '10002', '["m1","m2","m3","m4"]'::jsonb),
  ('i3',  '1.2.2', 'Beef Chapli Burger',     'c1', 470, '10003', '["m1","m2","m3","m4"]'::jsonb),
  ('i4',  '1.3',   'Chicken Tikka Burger',   'c1', 500, '10004', '["m1","m2","m3","m4"]'::jsonb),
  ('i5',  '1.4',   'Jumbo Crispy Burger',    'c1', 520, '10005', '["m1","m2","m3","m4"]'::jsonb),
  ('i6',  '1.5.1', 'Crunchy Burger',         'c1', 550, '10006', '["m1","m2","m3","m4"]'::jsonb),
  ('i7',  '1.5.2', 'Zinger Burger',          'c1', 550, '10007', '["m1","m2","m3","m4"]'::jsonb),
  ('i8',  '1.6',   'Munchies Grilled Burger','c1', 600, '10008', '["m1","m2","m3","m4"]'::jsonb),
  ('i9',  '1.7.1', 'Jumbo Crunchy Burger',   'c1', 650, '10009', '["m1","m2","m3","m4"]'::jsonb),
  ('i10', '1.7.2', 'Jumbo Zinger Burger',    'c1', 650, '10010', '["m1","m2","m3","m4"]'::jsonb),
  ('i11', '1.8.1', 'Mighty Burger',          'c1', 750, '10011', '["m1","m2","m3","m4"]'::jsonb),
  ('i12', '1.8.2', 'Mighty Zinger Burger',   'c1', 800, '10012', '["m1","m2","m3","m4"]'::jsonb),
  ('i13', '1.9.1', 'Fried Chicken (1 pc)',   'c19', 220, '10013', '[]'::jsonb),
  ('i14', '1.9.2', 'Fried Chicken (3 pc)',   'c19', 600, '10014', '[]'::jsonb),
  ('i15', '1.9.3', 'Fried Chicken (6 pc)',   'c19', 1100, '10015', '[]'::jsonb),
  ('i16', '2.1',   'Regular Fries',          'c2', 200, '10016', '[]'::jsonb),
  ('i17', '2.1.2', 'Loaded Fries',           'c2', 350, '10017', '[]'::jsonb),
  ('i18', '2.1.3', 'Masala Fries',           'c2', 250, '10018', '[]'::jsonb),
  ('i19', '2.2.1', 'Soft Drink Regular',     'c22', 120, '10019', '[]'::jsonb),
  ('i20', '2.3.3', 'Large Drink',            'c22', 220, '10020', '[]'::jsonb),
  ('i21', '2.2.4', 'Mineral Water',          'c22', 80, '10021', '[]'::jsonb),
  ('i22', '4.1',   'Small Pizza',            'c4', 850, '10022', '[]'::jsonb),
  ('i23', '4.2',   'Medium Pizza',           'c4', 1200, '10023', '[]'::jsonb),
  ('i24', '4.3',   'Large Pizza',            'c4', 1550, '10024', '[]'::jsonb)
on conflict (id) do nothing;

-- Sample customers (from the Customer base screenshot).
insert into public.customers (id, name, phone, first_visit, last_visit, visits, spent) values
  ('cu1', 'Rajpoot',      '03105084474', '02 Dec 2025', '04 Mar 2026 at 20:07', 9, 49870),
  ('cu2', 'Saleem',       '03075727952', '24 Jan 2026', '11 May 2026 at 19:29', 7, 23830),
  ('cu3', 'Aqib',         '03230958283', '25 Dec 2025', '14 Jun 2026 at 15:30', 6, 18170),
  ('cu4', 'Hafiz Waheed', '03035932380', '13 Aug 2025', '13 Aug 2025 at 14:23', 3, 16500),
  ('cu5', '',             '03706207690', '05 May 2026', '21 May 2026 at 19:24', 2, 15640),
  ('cu6', '',             '03120894676', '14 May 2026', '23 Jun 2026 at 20:16', 3, 13460)
on conflict (id) do nothing;

-- An "Owner" employee row so the Employee list isn't empty out of the box.
insert into public.employees (id, name, role_id) values ('emp-owner', 'Owner', 'r-owner')
on conflict (id) do nothing;

-- =============================================================================
-- V2 ADDITIONS  (safe to re-run)
--   * Extra columns: items.variants, business_settings.receipt/dining/printers,
--     receipts.discount_name
--   * Admin RPCs: set staff password/role, delete own account
--   * item-images Storage bucket + policies
--   * Sample receipts + lines so the reports show real data
-- =============================================================================
alter table public.items add column if not exists variants jsonb not null default '[]'::jsonb;
alter table public.business_settings add column if not exists receipt  jsonb not null default '{}'::jsonb;
alter table public.business_settings add column if not exists dining   jsonb not null default '[]'::jsonb;
alter table public.business_settings add column if not exists printers jsonb not null default '[]'::jsonb;
alter table public.receipts add column if not exists discount_name text;

-- Default dining options + receipt config for the single settings row.
update public.business_settings
   set dining = '[{"name":"Dine in","enabled":true},{"name":"Takeout","enabled":true},{"name":"Delivery","enabled":true,"charge":150}]'::jsonb
 where id = 1 and (dining is null or dining = '[]'::jsonb);
update public.business_settings
   set receipt = '{"header":"Munchies","footer":"Thank you for your visit!","showLogo":true,"showComments":true}'::jsonb
 where id = 1 and (receipt is null or receipt = '{}'::jsonb);

-- ---- Admin RPC: set a staff member's app-login password -------------------
create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_set_staff_password(target_email text, new_password text)
returns void language plpgsql security definer set search_path = public, auth, extensions as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can do this.'; end if;
  if new_password is null or length(new_password) < 6 then raise exception 'Password must be at least 6 characters.'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(target_email)) limit 1;
  if uid is null then raise exception 'No login found for %.', target_email; end if;
  update auth.users set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now() where id = uid;
end; $$;
revoke all on function public.admin_set_staff_password(text, text) from public, anon;
grant execute on function public.admin_set_staff_password(text, text) to authenticated;

-- ---- Admin RPC: set a staff member's access role --------------------------
create or replace function public.admin_set_staff_role(target_email text, new_role text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can do this.'; end if;
  if new_role is null or lower(trim(new_role)) not in ('admin','staff','owner') then raise exception 'Invalid role.'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(target_email)) limit 1;
  if uid is null then raise exception 'No login found for %.', target_email; end if;
  update public.profiles set role = lower(trim(new_role)) where user_id = uid;
end; $$;
revoke all on function public.admin_set_staff_role(text, text) from public, anon;
grant execute on function public.admin_set_staff_role(text, text) to authenticated;

-- ---- RPC: delete the caller's own account (used by Account → Delete) -------
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Not signed in.'; end if;
  delete from auth.users where id = auth.uid();  -- cascades to profiles
end; $$;
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- ---- Admin RPC: delete a staff member's app login by email -----------------
create or replace function public.admin_delete_staff(target_email text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'Only admins can do this.'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(target_email)) limit 1;
  if uid is null then return; end if;                 -- no login to remove
  if uid = auth.uid() then raise exception 'Use Account → Delete to remove your own login.'; end if;
  delete from auth.users where id = uid;              -- cascades to profiles
end; $$;
revoke all on function public.admin_delete_staff(text) from public, anon;
grant execute on function public.admin_delete_staff(text) to authenticated;

-- ---- Storage: item images (public read, admin write) ----------------------
insert into storage.buckets (id, name, public) values ('item-images', 'item-images', true)
on conflict (id) do nothing;

drop policy if exists "item images read" on storage.objects;
create policy "item images read" on storage.objects for select using (bucket_id = 'item-images');
drop policy if exists "item images write" on storage.objects;
create policy "item images write" on storage.objects for insert to authenticated with check (bucket_id = 'item-images' and public.is_admin());
drop policy if exists "item images modify" on storage.objects;
create policy "item images modify" on storage.objects for update to authenticated using (bucket_id = 'item-images' and public.is_admin());
drop policy if exists "item images delete" on storage.objects;
create policy "item images delete" on storage.objects for delete to authenticated using (bucket_id = 'item-images' and public.is_admin());

-- ---- Sample sales (receipts + lines) so reports have real data ------------
insert into public.receipts (id, number, type, employee_id, customer_id, subtotal, discount, discount_name, total, dining, created_at) values
  ('rc1','3-3987','Sale','emp-owner',null, 800,   0,   null,               800,  'Eat In',   '2026-07-03 21:41+05'),
  ('rc2','3-3986','Sale','emp-owner',null, 220,   0,   null,               220,  'Takeaway', '2026-07-03 20:37+05'),
  ('rc3','3-3985','Sale','emp-owner','cu3',2150, 200, 'Residents Discount', 1950, 'Eat In',   '2026-07-03 20:31+05'),
  ('rc4','3-3984','Sale','emp-owner',null, 650,   0,   null,               650,  'Eat In',   '2026-07-03 20:29+05'),
  ('rc5','3-3983','Sale','emp-owner',null, 1400,  0,   null,               1400, 'Eat In',   '2026-07-02 20:04+05'),
  ('rc6','3-3982','Sale','emp-owner','cu1',2700, 300, 'Family Discount',    2400, 'Takeaway', '2026-07-02 19:47+05'),
  ('rc7','3-3981','Sale','emp-owner',null, 990,   0,   null,               990,  'Eat In',   '2026-07-01 19:22+05'),
  ('rc8','3-3980','Sale','emp-owner',null, 1600,  0,   null,               1600, 'Eat In',   '2026-07-01 18:58+05'),
  ('rc9','3-3979','Sale','emp-owner',null, 450,   0,   null,               450,  'Delivery', '2026-06-30 18:31+05'),
  ('rc10','3-3978','Sale','emp-owner','cu2',1200, 0,  null,               1200, 'Takeaway', '2026-06-30 18:05+05')
on conflict (id) do nothing;

insert into public.receipt_lines (id, receipt_id, item_id, code, name, qty, unit, line_total, modifiers) values
  ('rl1','rc1','i8','1.6','Munchies Grilled Burger',1,600,600,'[]'::jsonb),
  ('rl2','rc1','i16','2.1','Regular Fries',1,200,200,'[]'::jsonb),
  ('rl3','rc2','i19','2.2.1','Soft Drink Regular',1,120,120,'[]'::jsonb),
  ('rl4','rc2','i20','2.3.3','Large Drink',1,220,220,'[]'::jsonb),
  ('rl5','rc3','i24','4.3','Large Pizza',1,1550,1550,'[]'::jsonb),
  ('rl6','rc3','i7','1.5.2','Zinger Burger',1,550,600,'[{"name":"Double","price":200}]'::jsonb),
  ('rl7','rc4','i10','1.7.2','Jumbo Zinger Burger',1,650,650,'[]'::jsonb),
  ('rl8','rc5','i1','1.1','Crispy Burger',2,400,800,'[{"name":"Double","price":200}]'::jsonb),
  ('rl9','rc5','i16','2.1','Regular Fries',3,200,600,'[]'::jsonb),
  ('rl10','rc6','i23','4.2','Medium Pizza',1,1200,1200,'[]'::jsonb),
  ('rl11','rc6','i11','1.8.1','Mighty Burger',2,750,1500,'[]'::jsonb),
  ('rl12','rc7','i4','1.3','Chicken Tikka Burger',1,500,500,'[]'::jsonb),
  ('rl13','rc7','i17','2.1.2','Loaded Fries',1,350,490,'[]'::jsonb),
  ('rl14','rc8','i9','1.7.1','Jumbo Crunchy Burger',2,650,1300,'[]'::jsonb),
  ('rl15','rc8','i16','2.1','Regular Fries',1,200,300,'[]'::jsonb),
  ('rl16','rc9','i16','2.1','Regular Fries',1,200,200,'[]'::jsonb),
  ('rl17','rc9','i19','2.2.1','Soft Drink Regular',2,120,250,'[]'::jsonb),
  ('rl18','rc10','i23','4.2','Medium Pizza',1,1200,1200,'[]'::jsonb)
on conflict (id) do nothing;

-- =============================================================================
-- DONE. Next:
--   1) Authentication → Providers → Email: turn OFF "Confirm email".
--   2) Authentication → Users → Add user  (this FIRST user becomes admin).
--      Use it to sign in to the Munchies admin panel.
--   3) Any employees you add later default to 'staff' (app only). To make one an
--      admin, set their role via: update public.profiles set role='admin'
--      where email='them@example.com';
-- =============================================================================
