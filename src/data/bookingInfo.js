// Booking display helpers shared by the Shots admin pages.
//
// STATUS
//   The database keeps status = 'Active' for every booking until it is
//   cancelled, so the real state is worked out from the booking's date + time:
//     Cancelled  — cancelled by staff (kept for the record)
//     Upcoming   — starts later
//     Active     — playing right now
//     Completed  — already finished
//
// PRICING
//   Bookings store how they were charged (pricing_mode / units / unit_price /
//   duration_minutes). bookingPricing() turns that into readable text, e.g.
//     "Per game · 2 games × Rs. 350"   "Per hour · 1 hr 30 min @ Rs. 800/hr"

const MODE_LABEL = { hour: 'Per hour', minute: 'Per minute', game: 'Per game' };

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
}

function at(dateStr, mins) {
  const [y, mo, d] = String(dateStr || '').split('-').map(Number);
  if (!y) return null;
  return new Date(y, mo - 1, d, 0, mins, 0, 0);
}

/** 'Cancelled' | 'Upcoming' | 'Active' | 'Completed' */
export function bookingStatus(b, now = new Date()) {
  if (!b) return 'Active';
  if (b.status === 'Cancelled' || b.status === 'Completed') return b.status;
  const startMin = toMinutes(b.start);
  let endMin = toMinutes(b.end);
  if (startMin == null || endMin == null) return b.status || 'Active';
  if (endMin <= startMin) endMin += 24 * 60; // runs past midnight
  const start = at(b.date, startMin);
  const end = at(b.date, endMin);
  if (!start || !end) return b.status || 'Active';
  if (now < start) return 'Upcoming';
  if (now >= end) return 'Completed';
  return 'Active';
}

/** Booked length in minutes (stored value, else from the time range). */
export function bookingMinutes(b) {
  if (num(b?.durationMinutes) > 0) return num(b.durationMinutes);
  const s = toMinutes(b?.start);
  let e = toMinutes(b?.end);
  if (s == null || e == null) return 0;
  if (e <= s) e += 24 * 60;
  return e - s;
}

export function minutesLabel(mins) {
  const m = Math.max(0, Math.round(num(mins)));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}

/** 'Per game' | 'Per hour' | 'Per minute' */
export function pricingModeLabel(b) {
  return MODE_LABEL[b?.pricingMode] || MODE_LABEL.hour;
}

/** What was bought: "2 games", "1 hr 30 min", "45 min". */
export function pricingQuantity(b) {
  if (b?.pricingMode === 'game') {
    const games = Math.max(1, Math.round(num(b.units) || 1));
    return `${games} game${games === 1 ? '' : 's'}`;
  }
  return minutesLabel(bookingMinutes(b));
}

/** Price of one unit with its suffix: "Rs. 350/game", "Rs. 800/hr", "Rs. 12/min". */
export function pricingRate(b) {
  const price = num(b?.unitPrice);
  if (!price) return '';
  const unit = b?.pricingMode === 'game' ? 'game' : b?.pricingMode === 'minute' ? 'min' : 'hr';
  return `Rs. ${price.toLocaleString()}/${unit}`;
}

/** One line for tables / CSV: "Per game · 2 games × Rs. 350". */
export function bookingPricing(b) {
  const rate = pricingRate(b);
  const qty = pricingQuantity(b);
  if (b?.pricingMode === 'game') {
    return `${pricingModeLabel(b)} · ${qty}${rate ? ` × ${rate.replace('/game', '')}` : ''}`;
  }
  return `${pricingModeLabel(b)} · ${qty}${rate ? ` @ ${rate}` : ''}`;
}
