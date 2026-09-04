// Pricing engine — pure helpers shared by the booking screens.
//
// Prices live in Supabase (`pricing_rules`, see supabase/shots_pricing_migration.sql)
// and are defined per TABLE TYPE for three modes:
//
//   hour   — flat price per hour, per player tier          (best value, long sessions)
//   minute — pay as you play, per minute, with a minimum   (e.g. min 10 min, 2 players)
//   game   — flat price per game, per player tier, each game capped at max_minutes
//
// A rule's `players` field is the UPPER BOUND of its tier: a booking with N
// players uses the cheapest tier where N <= players. `players = 0` means the
// price is not player-based (per-minute).

export const PRICING_MODES = [
  { value: 'hour',   label: 'Per Hour',   short: 'Hour',   icon: 'time',         hint: 'Best value for long sessions' },
  { value: 'minute', label: 'Per Minute', short: 'Minute', icon: 'stopwatch',    hint: 'Pay as you play' },
  { value: 'game',   label: 'Per Game',   short: 'Game',   icon: 'game-controller', hint: 'Flat price per game' },
];

export const DEFAULT_MODE = 'hour';

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

/** Every active rule for a table type + mode, cheapest player tier first. */
export function rulesFor(pricingRules = [], tableType, mode) {
  return pricingRules
    .filter((r) => r.active !== false && r.tableType === tableType && r.mode === mode)
    .sort((a, b) => num(a.players) - num(b.players) || num(a.sortOrder) - num(b.sortOrder));
}

/** The modes this table type actually has prices for, in PRICING_MODES order. */
export function modesForType(pricingRules = [], tableType) {
  return PRICING_MODES.filter((m) => rulesFor(pricingRules, tableType, m.value).length > 0);
}

/**
 * The rule that applies to `players` people — the cheapest tier that still fits
 * them. Falls back to the largest tier so a 6-player booking still prices.
 */
export function pickRule(pricingRules = [], tableType, mode, players = 1) {
  const list = rulesFor(pricingRules, tableType, mode);
  if (list.length === 0) return null;
  const p = Math.max(1, num(players, 1));
  return list.find((r) => num(r.players) === 0 || num(r.players) >= p) || list[list.length - 1];
}

/** Rs. price of one unit (hour / minute / game) for this booking's audience. */
export function priceOf(rule, isMember) {
  if (!rule) return 0;
  return num(isMember ? rule.memberPrice : rule.nonMemberPrice);
}

/** How long one game runs, in minutes (per-game mode). */
export function gameMinutes(rule) {
  return Math.max(1, num(rule?.maxMinutes, 30));
}

/** The shortest chargeable session, in minutes (per-minute mode). */
export function minMinutes(rule) {
  return Math.max(1, num(rule?.minMinutes, 1));
}

/** Player-tier label for a rule — "Up to 2 players", "3–4 players", … */
export function tierLabel(rule, allRulesForMode = []) {
  if (!rule || num(rule.players) === 0) return null;
  const cap = num(rule.players);
  const lower = num(rule.minPlayers, 0);
  const prev = allRulesForMode
    .filter((r) => num(r.players) > 0 && num(r.players) < cap)
    .reduce((max, r) => Math.max(max, num(r.players)), 0);
  const from = lower > 1 ? lower : prev + 1;
  if (from >= cap) return `${cap} player${cap === 1 ? '' : 's'}`;
  if (from <= 1) return `Up to ${cap} players`;
  return `${from}–${cap} players`;
}

/**
 * Is this mode usable for `players` people?
 * The per-minute card is "2 players only", expressed as min_players/max_players.
 */
export function playersAllowed(rule, players) {
  if (!rule) return false;
  const p = Math.max(1, num(players, 1));
  const min = num(rule.minPlayers, 0);
  const max = num(rule.maxPlayers, 0);
  if (min && p < min) return false;
  if (max && p > max) return false;
  return true;
}

/** Human sentence describing the rule's constraints, for hints under the picker. */
export function ruleConstraints(rule) {
  if (!rule) return '';
  const bits = [];
  if (rule.mode === 'minute' && num(rule.minMinutes)) bits.push(`minimum ${num(rule.minMinutes)} minutes`);
  if (rule.mode === 'game' && num(rule.maxMinutes)) bits.push(`max ${num(rule.maxMinutes)} min per game`);
  const min = num(rule.minPlayers, 0);
  const max = num(rule.maxPlayers, 0);
  if (min && max && min === max) bits.push(`${min} players only`);
  else if (max) bits.push(`up to ${max} players`);
  return bits.join(' · ');
}

/**
 * Price a booking.
 *
 * @param mode      'hour' | 'minute' | 'game'
 * @param rule      the pricing rule picked for this booking (may be null)
 * @param isMember  member pricing or walk-in pricing
 * @param minutes   requested length — used by 'hour' and 'minute'
 * @param games     number of games — used by 'game'
 *
 * @returns { subtotal, unitPrice, units, durationMinutes, unitLabel, label, error }
 */
export function computeCharge({ mode, rule, isMember, minutes = 0, games = 1 }) {
  const unitPrice = priceOf(rule, isMember);

  if (!rule) {
    return {
      subtotal: 0, unitPrice: 0, units: 0, durationMinutes: num(minutes),
      unitLabel: '', label: '', error: 'No price is set up for this table type yet.',
    };
  }

  if (mode === 'minute') {
    const floorMin = minMinutes(rule);
    const asked = Math.max(0, Math.round(num(minutes)));
    const billed = Math.max(asked, floorMin);
    return {
      subtotal: Math.round(unitPrice * billed),
      unitPrice,
      units: billed,
      durationMinutes: billed,
      unitLabel: 'min',
      label: `Per minute · ${billed} min`,
      error: asked > 0 && asked < floorMin ? `Minimum ${floorMin} minutes — billed as ${floorMin}.` : null,
    };
  }

  if (mode === 'game') {
    const count = Math.max(1, Math.round(num(games, 1)));
    const perGame = gameMinutes(rule);
    return {
      subtotal: Math.round(unitPrice * count),
      unitPrice,
      units: count,
      durationMinutes: count * perGame,
      unitLabel: count === 1 ? 'game' : 'games',
      label: `Per game · ${count} × ${perGame} min`,
      error: null,
    };
  }

  // 'hour' — priced pro-rata so a 30-minute slot costs half an hour.
  const mins = Math.max(0, Math.round(num(minutes)));
  return {
    subtotal: Math.round((unitPrice * mins) / 60),
    unitPrice,
    units: Number((mins / 60).toFixed(2)),
    durationMinutes: mins,
    unitLabel: 'hr',
    label: `Per hour · ${minutesToLabel(mins)}`,
    error: null,
  };
}

/** "90" -> "1 hr 30 min" */
export function minutesToLabel(mins) {
  const m = Math.max(0, Math.round(num(mins)));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} hr ${rem} min` : `${h} hr`;
}

/** Per-unit suffix shown next to a price ("/ min", "/ game", "/ hr"). */
export function unitSuffix(mode) {
  if (mode === 'minute') return '/ min';
  if (mode === 'game') return '/ game';
  return '/ hr';
}

/**
 * One-line price summary for a table type — used on table cards.
 * e.g. "Rs. 12/min · Rs. 250/game · Rs. 500/hr"
 */
export function priceSummary(pricingRules = [], tableType, isMember = true) {
  const parts = [];
  PRICING_MODES.forEach((m) => {
    const list = rulesFor(pricingRules, tableType, m.value);
    if (list.length === 0) return;
    const cheapest = Math.min(...list.map((r) => priceOf(r, isMember)));
    parts.push(`Rs. ${cheapest}${unitSuffix(m.value).replace('/ ', '/')}`);
  });
  return parts.join(' · ');
}

/** How many 15-minute slots a booking of `minutes` occupies (always rounds up). */
export function slotsForMinutes(minutes, stepMin = 15) {
  return Math.max(1, Math.ceil(Math.max(1, num(minutes)) / stepMin));
}
