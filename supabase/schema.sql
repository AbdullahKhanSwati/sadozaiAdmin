-- =============================================================================
-- SADOZAI ADMIN — Supabase schema
-- Paste this whole file into: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT / CREATE OR REPLACE).
-- Decisions baked in:
--   * Real Supabase Auth (admins are real auth.users; profiles hold role/business)
--   * Operational data starts EMPTY (only the 4 businesses are seeded)
--   * Shots-only now, but every table carries business_id + RLS for future tenants
--   * Member photos / CNIC images live in Supabase Storage (URLs stored in rows)
-- =============================================================================

-- pgcrypto (gen_random_uuid) is enabled by default on Supabase; ensure it:
create extension if not exists pgcrypto;

-- =============================================================================
-- 1. BUSINESSES  (tenant registry — drives the login picker; publicly readable)
-- =============================================================================
create table if not exists public.businesses (
  id              text primary key,          -- slug, e.g. 'shots'
  name            text not null,
  type            text,
  tag             text,
  emoji           text,
  accent          text,
  accent_dark     text,
  available       boolean not null default false,
  summary         text,
  default_email   text,
  default_password text,                      -- demo hint shown on login only
  sort_order      int default 0,
  created_at      timestamptz default now()
);

-- =============================================================================
-- 2. PROFILES  (one row per admin user, linked to Supabase auth.users)
-- =============================================================================
create table if not exists public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  business_id text references public.businesses(id),
  name        text default 'Admin',
  role        text default 'Owner',
  email       text,
  phone       text,
  created_at  timestamptz default now()
);

-- Helper: the business_id of the currently signed-in admin.
-- SECURITY DEFINER so it can read profiles regardless of RLS.
create or replace function public.current_business_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Auto-create a profile when a new auth user is created (defaults to Shots).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, business_id, email, name, role)
  values (
    new.id,
    'shots',
    new.email,
    coalesce(new.raw_user_meta_data->>'name', 'Admin'),
    'Owner'
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
-- 3. TIERS  (membership card tiers — Memberships / TiersDialog / MemberDialog)
-- =============================================================================
create table if not exists public.tiers (
  id          uuid primary key default gen_random_uuid(),
  business_id text not null references public.businesses(id) on delete cascade,
  tier        text not null,                  -- e.g. 'Premium'
  monthly     numeric not null default 0,
  color       text default '#E53E3E',
  icon        text default 'shield',
  perks       jsonb not null default '[]'::jsonb,
  created_at  timestamptz default now()
);
create index if not exists tiers_business_idx on public.tiers(business_id);

-- =============================================================================
-- 4. POOL_TABLES  (the snooker/pool tables — Tables page)
--    Named pool_tables to avoid the SQL keyword "table".
-- =============================================================================
create table if not exists public.pool_tables (
  id              bigint generated always as identity primary key,
  business_id     text not null references public.businesses(id) on delete cascade,
  number          int not null,
  type            text not null default 'Pool',     -- Pool | Snooker
  location        text default 'Main Hall',
  status          text default 'Available',          -- Available | Occupied | Maintenance
  condition       text default 'Excellent',
  last_cleaned    date,
  member_rate     numeric default 400,
  non_member_rate numeric default 600,
  open_time       text default '11:00',              -- 'HH:MM' (kept as text to match UI)
  close_time      text default '23:00',
  occupied_until  timestamptz,
  occupied_by     text,
  created_at      timestamptz default now(),
  unique (business_id, number)
);
create index if not exists pool_tables_business_idx on public.pool_tables(business_id);

-- =============================================================================
-- 5. MEMBERS  (Memberships / MemberDetail / MemberDialog)
--    id is the human card id like 'A234567' (generated client-side from CNIC).
-- =============================================================================
create table if not exists public.members (
  id          text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  name        text not null,
  type        text,                            -- tier name (matches tiers.tier)
  cnic        text,
  join_date   date default current_date,
  expiry_date date,
  status      text default 'Active',           -- Active | Expired
  phone       text,
  email       text,
  visits      int default 0,
  total_spent numeric default 0,
  photo       text,                            -- Storage public URL
  cnic_image  text,                            -- Storage path / filename
  created_at  timestamptz default now()
);
create index if not exists members_business_idx on public.members(business_id);

-- =============================================================================
-- 6. BOOKINGS  (Bookings / Dashboard / MemberDetail / Reports)
-- =============================================================================
create table if not exists public.bookings (
  id           bigint generated always as identity primary key,
  business_id  text not null references public.businesses(id) on delete cascade,
  table_id     bigint references public.pool_tables(id) on delete set null,
  table_number int,
  date         date not null,
  start_time   text not null,                  -- 'HH:MM'  (maps to UI `start`)
  end_time     text not null,                  -- 'HH:MM'  (maps to UI `end`)
  intervals    jsonb default '[]'::jsonb,      -- ['11:00','11:15', ...]
  status       text default 'Active',          -- Active | Upcoming | Completed | Cancelled
  amount       numeric default 0,
  subtotal     numeric default 0,
  players      int default 1,
  is_member    boolean default true,
  member_id    text references public.members(id) on delete set null,
  member_name  text,
  member_type  text,
  members      jsonb default '[]'::jsonb,       -- [{id,name,type}, ...] multi-member
  discount     jsonb,                            -- {type,value,amount,reason} | null
  created_at   timestamptz default now()
);
create index if not exists bookings_business_date_idx on public.bookings(business_id, date);
create index if not exists bookings_member_idx on public.bookings(member_id);

-- =============================================================================
-- 7. TRANSACTIONS  (Finance + Expenses — In/Out cash entries)
-- =============================================================================
create table if not exists public.transactions (
  id          bigint generated always as identity primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  date        date not null default current_date,
  time        text,                            -- 'HH:MM'
  type        text not null default 'In',      -- In | Out
  category    text,
  amount      numeric not null default 0,
  description text,
  table_ref   int,                             -- optional table number this relates to
  created_at  timestamptz default now()
);
create index if not exists transactions_business_date_idx on public.transactions(business_id, date);

-- =============================================================================
-- 8. STAFF  (Staff page)
-- =============================================================================
create table if not exists public.staff (
  id          bigint generated always as identity primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  name        text not null,
  role        text,
  email       text,
  phone       text,
  status      text default 'Active',           -- Active | On Leave | Suspended
  joined_at   date default current_date,
  salary      numeric default 0,
  created_at  timestamptz default now()
);
create index if not exists staff_business_idx on public.staff(business_id);

-- =============================================================================
-- 9. BUSINESS_SETTINGS  (Settings page — one row per business, JSON sections)
-- =============================================================================
create table if not exists public.business_settings (
  business_id   text primary key references public.businesses(id) on delete cascade,
  profile       jsonb default '{}'::jsonb,
  rates         jsonb default '{}'::jsonb,
  hours         jsonb default '{}'::jsonb,
  notifications jsonb default '{}'::jsonb,
  security      jsonb default '{}'::jsonb,
  locale        jsonb default '{}'::jsonb,
  updated_at    timestamptz default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.businesses        enable row level security;
alter table public.profiles          enable row level security;
alter table public.tiers             enable row level security;
alter table public.pool_tables       enable row level security;
alter table public.members           enable row level security;
alter table public.bookings          enable row level security;
alter table public.transactions      enable row level security;
alter table public.staff             enable row level security;
alter table public.business_settings enable row level security;

-- Businesses: readable by everyone (login picker runs before auth). No client writes.
drop policy if exists "businesses readable" on public.businesses;
create policy "businesses readable"
  on public.businesses for select
  using (true);

-- Profiles: a user can read & update only their own row.
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select
  using (user_id = auth.uid());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Tenant tables: an admin may do anything within their own business only.
-- (one FOR ALL policy per table)
do $$
declare t text;
begin
  foreach t in array array[
    'tiers','pool_tables','members','bookings','transactions','staff','business_settings'
  ]
  loop
    execute format('drop policy if exists "tenant access" on public.%I;', t);
    execute format($f$
      create policy "tenant access" on public.%I
        for all to authenticated
        using (business_id = public.current_business_id())
        with check (business_id = public.current_business_id());
    $f$, t);
  end loop;
end$$;

-- =============================================================================
-- STORAGE BUCKETS  (member photos = public for <img>; CNIC = private)
-- =============================================================================
insert into storage.buckets (id, name, public) values
  ('member-photos', 'member-photos', true),
  ('member-cnic',   'member-cnic',   false)
on conflict (id) do nothing;

-- member-photos: public read, authenticated write/update/delete
drop policy if exists "member photos read"   on storage.objects;
create policy "member photos read"
  on storage.objects for select
  using (bucket_id = 'member-photos');

drop policy if exists "member photos write"  on storage.objects;
create policy "member photos write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'member-photos');

drop policy if exists "member photos modify" on storage.objects;
create policy "member photos modify"
  on storage.objects for update to authenticated
  using (bucket_id = 'member-photos');

drop policy if exists "member photos delete" on storage.objects;
create policy "member photos delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'member-photos');

-- member-cnic: authenticated-only read + write (sensitive ID images)
drop policy if exists "member cnic read"   on storage.objects;
create policy "member cnic read"
  on storage.objects for select to authenticated
  using (bucket_id = 'member-cnic');

drop policy if exists "member cnic write"  on storage.objects;
create policy "member cnic write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'member-cnic');

drop policy if exists "member cnic delete" on storage.objects;
create policy "member cnic delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'member-cnic');

-- =============================================================================
-- SEED — only the tenant registry (operational data stays empty)
-- =============================================================================
insert into public.businesses (id, name, type, tag, emoji, accent, accent_dark, available, summary, default_email, default_password, sort_order) values
  ('shots',              'Shots',              'Snooker & Pool Club', 'Premium Club',  '🎱',  '#E53E3E', '#B91C2C', true,  'Tables, memberships, bookings, finance',  'admin@shots.com', 'admin123', 1),
  ('sadozai',            'Sadozai Blocks',     'Block Factory',       'Manufacturing', '🏭',  '#F4B860', '#B47A2B', false, 'Production, dispatch, raw materials',     null, null, 2),
  ('munchies',           'Munchies',           'Food Restaurant',     'Food & Drinks', '🍔',  '#FF6B6B', '#C44141', false, 'Menu, orders, kitchen, delivery',         null, null, 3),
  ('sadozai-properties', 'Sadozai Properties', 'Real Estate',         'Property',      '🏘️', '#3B82F6', '#1D4ED8', false, 'Listings, tenants, rent & contracts',     null, null, 4)
on conflict (id) do nothing;

-- An empty settings row for Shots so the Settings page has somewhere to save.
insert into public.business_settings (business_id) values ('shots')
on conflict (business_id) do nothing;

-- =============================================================================
-- DONE. Next: create your admin login in
--   Dashboard → Authentication → Users → Add user
--   email: admin@shots.com   password: (your choice)
-- The trigger above will auto-create its profile under the 'shots' business.
-- =============================================================================
