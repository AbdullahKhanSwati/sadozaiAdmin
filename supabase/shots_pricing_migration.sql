-- =============================================================================
-- SHOTS — PRICING MODES MIGRATION  (structure only — NO prices)
--
-- Adds the storage + security for three booking modes. Every actual price is
-- entered by the admin in the dashboard (Pricing page) — this script inserts
-- no rates, no table types and no amounts of any kind.
--
--   1. minute  — pay as you play: a per-minute price plus a minimum billed
--                length, and optionally a player limit.
--   2. game    — a flat price per game, per player tier, each game capped to a
--                number of minutes.
--   3. hour    — a flat price per hour, per player tier.
--
-- Prices are stored PER TABLE TYPE (Pool, Snooker, …) so adding another table
-- of an existing type needs no extra pricing setup. Until the admin sets a
-- price for a table type, that type keeps using the per-table
-- `pool_tables.member_rate` / `non_member_rate` hourly fallback, so nothing
-- breaks between running this script and filling in the Pricing page.
--
-- HOW TO RUN: Supabase → SQL Editor → New query → paste ALL of this → Run.
-- Safe to re-run (idempotent).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PRICING RULES
--
--    One row = one selectable price option, created from the admin panel.
--
--    table_type  : matches a name in public.table_types (managed by the admin).
--    mode        : 'minute' | 'game' | 'hour'.
--    players     : the player tier this price covers, as an UPPER BOUND.
--                  A booking with N players uses the smallest tier where
--                  N <= players. 0 means "not player-based".
--    min_minutes : per-minute mode — the minimum billable minutes.
--    max_minutes : per-game mode  — how long one game may run.
--                  per-hour mode  — the length of one billable unit (usually 60).
--    min_players / max_players : who may use this mode at all
--                  (e.g. a per-minute rate restricted to 2 players).
--
--    All price/limit columns default to 0 or NULL — the admin fills them in.
-- -----------------------------------------------------------------------------
create table if not exists public.pricing_rules (
  id bigint generated always as identity not null,
  business_id text not null,
  table_type text not null,
  mode text not null,
  players integer not null default 0,
  member_price numeric not null default 0,
  non_member_price numeric not null default 0,
  min_minutes integer,
  max_minutes integer,
  min_players integer default 1,
  max_players integer,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now(),
  constraint pricing_rules_pkey primary key (id),
  constraint pricing_rules_business_id_fkey foreign key (business_id) references public.businesses(id),
  constraint pricing_rules_mode_check check (mode in ('minute', 'game', 'hour'))
);

-- One price per (business, table type, mode, player tier).
create unique index if not exists pricing_rules_unique_option
  on public.pricing_rules (business_id, table_type, mode, players);

create index if not exists pricing_rules_lookup
  on public.pricing_rules (business_id, table_type, mode);

-- -----------------------------------------------------------------------------
-- 2. BOOKINGS — remember HOW a booking was priced
--
--    Existing rows keep working: they are back-filled as 'hour' bookings, which
--    is exactly how they were charged before this migration. No amount on any
--    existing booking is changed.
-- -----------------------------------------------------------------------------
alter table public.bookings
  add column if not exists pricing_mode text default 'hour',
  add column if not exists pricing_rule_id bigint,
  add column if not exists pricing_label text,
  add column if not exists unit_price numeric default 0,
  add column if not exists units numeric default 0,
  add column if not exists duration_minutes integer;

do $$
begin
  alter table public.bookings
    add constraint bookings_pricing_rule_id_fkey
    foreign key (pricing_rule_id) references public.pricing_rules(id) on delete set null;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.bookings
    add constraint bookings_pricing_mode_check
    check (pricing_mode is null or pricing_mode in ('minute', 'game', 'hour'));
exception when duplicate_object then null;
end $$;

-- Back-fill legacy rows (charged per hour, held in 15-minute intervals).
update public.bookings
set pricing_mode = 'hour'
where pricing_mode is null;

update public.bookings
set duration_minutes = coalesce(jsonb_array_length(intervals), 0) * 15
where duration_minutes is null;

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY — same tenant rule as every other table
-- -----------------------------------------------------------------------------
alter table public.pricing_rules enable row level security;

drop policy if exists pricing_rules_tenant on public.pricing_rules;
create policy pricing_rules_tenant on public.pricing_rules
  for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- -----------------------------------------------------------------------------
-- 4. REALTIME — admin edits reach the staff app immediately
-- -----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.pricing_rules;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.table_types;
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- Done — structure only.
--
-- NEXT STEP (in the admin dashboard, not in SQL):
--   1. Tables → Manage types   — make sure your table types exist.
--   2. Pricing                 — pick a type and add its per-minute, per-game
--                                and per-hour prices, player tiers and limits.
--
-- Staff see every change instantly; a table type with no prices yet simply
-- keeps its per-table hourly rate and shows no mode picker when booking.
-- =============================================================================
