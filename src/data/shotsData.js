// Seed mock data for the Shots admin panel — ported and extended from the staff app.
// These are used by `ShotsStore` to initialize mutable state.

export const DEFAULT_OPEN = '11:00';
export const DEFAULT_CLOSE = '23:00';

function addHours(h) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + Math.round(h * 60));
  return d.toISOString();
}

export const initialTables = [
  { id: 1, number: 1, type: 'Snooker', status: 'Available', location: 'Main Hall',  condition: 'Excellent', lastCleaned: '2026-05-14', memberRate: 500, nonMemberRate: 700, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE },
  { id: 2, number: 2, type: 'Pool',    status: 'Occupied',  location: 'Main Hall',  condition: 'Good',      lastCleaned: '2026-05-13', memberRate: 400, nonMemberRate: 600, occupiedUntil: addHours(1.25), occupiedBy: 'Ahmed Khan', openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE },
  { id: 3, number: 3, type: 'Pool',    status: 'Available', location: 'Side Hall',  condition: 'Excellent', lastCleaned: '2026-05-14', memberRate: 400, nonMemberRate: 600, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE },
  { id: 4, number: 4, type: 'Snooker', status: 'Maintenance', location: 'Main Hall', condition: 'Fair',     lastCleaned: '2026-05-12', memberRate: 500, nonMemberRate: 700, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE },
  { id: 5, number: 5, type: 'Pool',    status: 'Available', location: 'VIP Section', condition: 'Good',     lastCleaned: '2026-05-14', memberRate: 700, nonMemberRate: 1000, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE },
  { id: 6, number: 6, type: 'Snooker', status: 'Occupied',  location: 'Main Hall',  condition: 'Excellent', lastCleaned: '2026-05-14', memberRate: 500, nonMemberRate: 700, occupiedUntil: addHours(2), occupiedBy: 'Hassan Ahmed', openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE },
  { id: 7, number: 7, type: 'Pool',    status: 'Available', location: 'Side Hall',  condition: 'Good',      lastCleaned: '2026-05-15', memberRate: 400, nonMemberRate: 600, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE },
  { id: 8, number: 8, type: 'Snooker', status: 'Available', location: 'VIP Section', condition: 'Excellent', lastCleaned: '2026-05-15', memberRate: 700, nonMemberRate: 1000, openTime: DEFAULT_OPEN, closeTime: DEFAULT_CLOSE },
];

export const initialMembers = [
  { id: 'A234567', name: 'Ahmed Khan',    type: 'Premium',  cnic: '35202-1234567-1', joinDate: '2025-01-15', expiryDate: '2026-01-14', status: 'Active',  phone: '+923499377144', email: 'ahmed@example.com',  visits: 42, totalSpent: 38500 },
  { id: 'A345678', name: 'Fatima Ali',    type: 'Standard', cnic: '35202-2345678-3', joinDate: '2024-06-20', expiryDate: '2025-06-19', status: 'Expired', phone: '+923012345678',  email: 'fatima@example.com', visits: 18, totalSpent: 15200 },
  { id: 'A456789', name: 'Hassan Ahmed',  type: 'Premium',  cnic: '35202-3456789-5', joinDate: '2025-03-10', expiryDate: '2026-03-09', status: 'Active',  phone: '+923023456789',  email: 'hassan@example.com', visits: 55, totalSpent: 47200 },
  { id: 'B567890', name: 'Zainab Malik',  type: 'Basic',    cnic: '35202-4567890-7', joinDate: '2025-11-01', expiryDate: '2026-11-01', status: 'Active',  phone: '+923034567890',  email: 'zainab@example.com', visits: 9,  totalSpent: 6800 },
  { id: 'A678901', name: 'Ali Raza',      type: 'Premium',  cnic: '35202-5678901-9', joinDate: '2025-02-14', expiryDate: '2026-02-13', status: 'Active',  phone: '+923045678901',  email: 'ali@example.com',    visits: 31, totalSpent: 29400 },
  { id: 'A789012', name: 'Bilal Tariq',   type: 'Standard', cnic: '35202-6789012-1', joinDate: '2025-08-04', expiryDate: '2026-08-03', status: 'Active',  phone: '+923056789012',  email: 'bilal@example.com',  visits: 22, totalSpent: 18900 },
  { id: 'B890123', name: 'Sana Iqbal',    type: 'Basic',    cnic: '35202-7890123-3', joinDate: '2024-12-15', expiryDate: '2025-12-14', status: 'Expired', phone: '+923067890123',  email: 'sana@example.com',   visits: 7,  totalSpent: 4200 },
  { id: 'A901234', name: 'Usman Sheikh',  type: 'Premium',  cnic: '35202-8901234-5', joinDate: '2025-04-22', expiryDate: '2026-04-21', status: 'Active',  phone: '+923078901234',  email: 'usman@example.com',  visits: 38, totalSpent: 34100 },
];

const today = '2026-05-17';
const yesterday = '2026-05-16';

export const initialBookings = [
  { id: 1,  tableId: 2, tableNumber: 2, date: today,     memberName: 'Ahmed Khan',                memberId: 'A234567', memberType: 'Premium',  isMember: true,  start: '09:00', end: '10:15', status: 'Active',    amount: 600,  players: 1 },
  { id: 2,  tableId: 6, tableNumber: 6, date: today,     memberName: 'Hassan Ahmed, Ahmed Khan',  memberId: 'A456789', memberType: 'Premium',  isMember: true,  start: '08:30', end: '10:30', status: 'Active',    amount: 1200, players: 2 },
  { id: 3,  tableId: 1, tableNumber: 1, date: today,     memberName: 'Ali Raza',                  memberId: 'A678901', memberType: 'Premium',  isMember: true,  start: '07:00', end: '08:30', status: 'Completed', amount: 900,  players: 1 },
  { id: 4,  tableId: 5, tableNumber: 5, date: today,     memberName: 'Zainab Malik',              memberId: 'B567890', memberType: 'Basic',    isMember: true,  start: '06:30', end: '07:30', status: 'Completed', amount: 800,  players: 1 },
  { id: 5,  tableId: 3, tableNumber: 3, date: today,     memberName: 'Walk-in Guest',             memberId: null,       memberType: null,       isMember: false, start: '14:00', end: '15:30', status: 'Active',    amount: 900,  players: 2 },
  { id: 6,  tableId: 1, tableNumber: 1, date: today,     memberName: 'Usman Sheikh',              memberId: 'A901234', memberType: 'Premium',  isMember: true,  start: '15:00', end: '17:00', status: 'Upcoming',  amount: 1000, players: 2 },
  { id: 7,  tableId: 7, tableNumber: 7, date: today,     memberName: 'Bilal Tariq',               memberId: 'A789012', memberType: 'Standard', isMember: true,  start: '18:30', end: '20:00', status: 'Upcoming',  amount: 750,  players: 2 },
  { id: 8,  tableId: 2, tableNumber: 2, date: yesterday, memberName: 'Hassan Ahmed',              memberId: 'A456789', memberType: 'Premium',  isMember: true,  start: '19:00', end: '21:00', status: 'Completed', amount: 800,  players: 1 },
  { id: 9,  tableId: 6, tableNumber: 6, date: yesterday, memberName: 'Walk-in Guest',             memberId: null,       memberType: null,       isMember: false, start: '20:30', end: '22:00', status: 'Completed', amount: 1050, players: 3 },
  { id: 10, tableId: 8, tableNumber: 8, date: yesterday, memberName: 'Ali Raza',                  memberId: 'A678901', memberType: 'Premium',  isMember: true,  start: '21:00', end: '23:00', status: 'Completed', amount: 1400, players: 2 },
];

// Compute booking intervals from start/end so conflict-detection works on seed data
initialBookings.forEach((b) => {
  if (!b.intervals) {
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    const ivs = [];
    const cur = new Date(); cur.setHours(sh, sm, 0, 0);
    for (let i = 0; i < Math.round(mins / 15); i++) {
      ivs.push(`${String(cur.getHours()).padStart(2, '0')}:${String(cur.getMinutes()).padStart(2, '0')}`);
      cur.setMinutes(cur.getMinutes() + 15);
    }
    b.intervals = ivs;
  }
});

export const initialFinance = [
  { id: 1,  date: today,        type: 'In',  category: 'Table Rental', amount: 5000,  description: 'Table 1 — 2 hour session', table: 1, time: '09:30' },
  { id: 2,  date: today,        type: 'In',  category: 'Membership',   amount: 3000,  description: 'New Premium membership — Ali', time: '10:15' },
  { id: 3,  date: today,        type: 'Out', category: 'Repair',       amount: 1500,  description: 'Felt patching kit — Table 4', table: 4, time: '11:00' },
  { id: 4,  date: today,        type: 'In',  category: 'Snacks',       amount: 2000,  description: 'Drinks & chips', time: '12:30' },
  { id: 5,  date: today,        type: 'In',  category: 'Table Rental', amount: 3500,  description: 'Table 5 — VIP session', table: 5, time: '15:00' },
  { id: 6,  date: yesterday,    type: 'Out', category: 'Utilities',    amount: 800,   description: 'Electricity bill', time: '14:00' },
  { id: 7,  date: yesterday,    type: 'In',  category: 'Table Rental', amount: 4500,  description: 'Evening session — Table 3', table: 3, time: '18:00' },
  { id: 8,  date: yesterday,    type: 'Out', category: 'Repair',       amount: 2200,  description: 'Cushion alignment — Table 2', table: 2, time: '15:30' },
  { id: 9,  date: yesterday,    type: 'In',  category: 'Snacks',       amount: 1800,  description: 'Cold drinks & chips', time: '20:00' },
  { id: 10, date: '2026-05-15', type: 'In',  category: 'Table Rental', amount: 8200,  description: 'Saturday peak — multiple tables', time: '20:30' },
  { id: 11, date: '2026-05-14', type: 'In',  category: 'Membership',   amount: 5000,  description: 'Premium membership — Usman', time: '11:00' },
  { id: 12, date: '2026-05-13', type: 'Out', category: 'Supplies',     amount: 3400,  description: 'Cue chalks & tip kits', time: '13:00' },
  { id: 13, date: '2026-05-12', type: 'In',  category: 'Table Rental', amount: 6300,  description: 'Tournament practice', time: '21:30' },
  { id: 14, date: '2026-05-11', type: 'Out', category: 'Cleaning',     amount: 1200,  description: 'Deep cleaning service', time: '10:00' },
  { id: 15, date: '2026-05-10', type: 'In',  category: 'Snacks',       amount: 2400,  description: 'Bar — soft drinks', time: '19:00' },
  { id: 16, date: '2026-05-09', type: 'In',  category: 'Table Rental', amount: 7700,  description: 'Weekend evening', time: '22:00' },
  { id: 17, date: '2026-05-08', type: 'Out', category: 'Maintenance',  amount: 1900,  description: 'Lighting check — VIP section', time: '11:30' },
  { id: 18, date: '2026-05-01', type: 'In',  category: 'Table Rental', amount: 9100,  description: 'Opening weekend', time: '21:30' },
  { id: 19, date: '2026-04-22', type: 'In',  category: 'Table Rental', amount: 8500,  description: 'April tournament', time: '20:00' },
  { id: 20, date: '2026-04-22', type: 'Out', category: 'Utilities',    amount: 5400,  description: 'April electricity', time: '12:00' },
  { id: 21, date: '2026-03-15', type: 'In',  category: 'Membership',   amount: 12000, description: 'Membership drive — March', time: '15:00' },
  { id: 22, date: '2026-03-15', type: 'Out', category: 'Repair',       amount: 4200,  description: 'Major felt replacement — Table 6', time: '16:00' },
];

export const initialStaff = [
  { id: 1, name: 'Yasir Hussain',   role: 'Manager',    email: 'yasir@shots.com',   phone: '+923334445566', status: 'Active',   joinedAt: '2024-01-12', salary: 65000 },
  { id: 2, name: 'Imran Saleem',    role: 'Floor Staff', email: 'imran@shots.com',   phone: '+923004445566', status: 'Active',   joinedAt: '2024-03-04', salary: 32000 },
  { id: 3, name: 'Awais Khan',      role: 'Cashier',     email: 'awais@shots.com',   phone: '+923215554466', status: 'Active',   joinedAt: '2024-08-21', salary: 38000 },
  { id: 4, name: 'Sara Ahmed',      role: 'Receptionist',email: 'sara@shots.com',    phone: '+923125557788', status: 'On Leave', joinedAt: '2024-10-06', salary: 30000 },
  { id: 5, name: 'Faizan Ali',      role: 'Maintenance', email: 'faizan@shots.com',  phone: '+923459998877', status: 'Active',   joinedAt: '2025-02-18', salary: 28000 },
];

export const repairs = [
  { id: 1, tableId: 4, tableNumber: 4, date: today,        cost: 1500, description: 'Replaced corner pocket leather.', status: 'In Progress', reportedBy: 'Imran' },
  { id: 2, tableId: 2, tableNumber: 2, date: '2026-05-13', cost: 800,  description: 'Cushion alignment.',              status: 'Completed',   reportedBy: 'Faizan' },
];

export const initialTiers = [
  { id: 'tier-basic',    tier: 'Basic',    monthly: 1500, color: '#64748B', icon: 'shield', perks: ['10% discount on table rates', 'Free cue use'] },
  { id: 'tier-standard', tier: 'Standard', monthly: 2500, color: '#3B82F6', icon: 'star',   perks: ['20% discount on table rates', 'Priority booking', 'Free cue use'] },
  { id: 'tier-premium',  tier: 'Premium',  monthly: 4500, color: '#A855F7', icon: 'crown',  perks: ['30% discount on table rates', 'VIP table access', 'Free snacks', 'Bring 1 guest free'] },
];

export const membershipDurations = [
  { label: '1 Month',  months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '1 Year',   months: 12 },
  { label: '2 Years',  months: 24 },
];

export const bookingDurations = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 h',    minutes: 60 },
  { label: '1.5 h',  minutes: 90 },
  { label: '2 h',    minutes: 120 },
  { label: '3 h',    minutes: 180 },
];

// Turn a minutes value into a friendly label, e.g. 15 → "15 min", 60 → "1 hr",
// 90 → "1 hr 30 min". Used wherever booking durations are shown.
export function minutesToLabel(mins) {
  const m = Number(mins) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  const hourPart = `${h} hr`;
  return rem ? `${hourPart} ${rem} min` : hourPart;
}

export const tableTypes  = ['Pool', 'Snooker'];
export const tableLocations = ['Main Hall', 'Side Hall', 'VIP Section', 'Outdoor'];
export const tableConditions = ['Excellent', 'Good', 'Fair', 'Poor'];
export const tableStatuses   = ['Available', 'Occupied', 'Maintenance'];

export const expenseCategories = ['Repair', 'Maintenance', 'Supplies', 'Cleaning', 'Utilities', 'Salaries', 'Other'];

// Helpers ====================================================================

export function dateKey(d) {
  if (typeof d === 'string') return d;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function rupees(n) {
  return `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
}

export function formatDate(d) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function relativeFromNow(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function previousMonths(count = 12, ref = new Date()) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    out.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      isCurrent: i === 0,
    });
  }
  return out;
}

export function isInMonth(dateStr, year, month) {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month;
}

export function isMonthToDate(dateStr, refDate = new Date()) {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === refDate.getFullYear() &&
    d.getMonth() === refDate.getMonth() &&
    d.getDate() <= refDate.getDate()
  );
}

// Inclusive { start, end } date-key range for a named timeframe, or null for
// "all time" (no bounds). Drives the Dashboard filter + export.
export function timeframeRange(key, refDate = new Date()) {
  const ref = new Date(refDate); ref.setHours(0, 0, 0, 0);
  switch (key) {
    case 'today':
      return { start: dateKey(ref), end: dateKey(ref) };
    case 'week': {
      const dow = (ref.getDay() + 6) % 7; // Monday = 0
      const start = new Date(ref); start.setDate(ref.getDate() - dow);
      return { start: dateKey(start), end: dateKey(ref) };
    }
    case 'mtd': {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
      return { start: dateKey(start), end: dateKey(ref) };
    }
    case 'lastMonth': {
      const start = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
      const end = new Date(ref.getFullYear(), ref.getMonth(), 0); // last day of prev month
      return { start: dateKey(start), end: dateKey(end) };
    }
    case 'year': {
      const start = new Date(ref.getFullYear(), 0, 1);
      return { start: dateKey(start), end: dateKey(ref) };
    }
    case 'all':
    default:
      return null;
  }
}

// Aggregations — all take a `finance` array so they work with the live store

export function getMTDFinance(finance, refDate = new Date()) {
  return finance.filter((f) => isMonthToDate(f.date, refDate));
}

export function getMonthFinance(finance, year, month) {
  return finance.filter((f) => isInMonth(f.date, year, month));
}

export function dailyRevenueSeries(finance, days = 14, ref = new Date()) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(ref.getDate() - i);
    const key = dateKey(d);
    const income  = finance.filter((f) => f.date === key && f.type === 'In').reduce((s, f) => s + f.amount, 0);
    const expense = finance.filter((f) => f.date === key && f.type === 'Out').reduce((s, f) => s + f.amount, 0);
    out.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      income,
      expense,
      net: income - expense,
    });
  }
  return out;
}

export function monthlyRevenueSeries(finance, months = 6, ref = new Date()) {
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const list = getMonthFinance(finance, d.getFullYear(), d.getMonth());
    const income  = list.filter((f) => f.type === 'In').reduce((s, f) => s + f.amount, 0);
    const expense = list.filter((f) => f.type === 'Out').reduce((s, f) => s + f.amount, 0);
    out.push({
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      income,
      expense,
      net: income - expense,
    });
  }
  return out;
}

export function categoryBreakdown(finance, type = 'In') {
  const map = new Map();
  finance.filter((f) => f.type === type).forEach((f) => {
    map.set(f.category, (map.get(f.category) || 0) + f.amount);
  });
  return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
}

// Custom from/to date-range helpers ========================================

// Predicate: is a 'YYYY-MM-DD' date string within [from, to]? Empty bound = open.
export function inRangePred(from, to) {
  return (d) => (!from || d >= from) && (!to || d <= to);
}

// Human label for a from/to range, used on KPI cards + export filenames.
export function rangeLabel(from, to) {
  if (!from && !to) return 'All time';
  const f = from ? formatDate(from) : '…';
  const t = to ? formatDate(to) : '…';
  return `${f} → ${t}`;
}

// Default range = current month-to-date.
export function defaultRange(ref = new Date()) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  return { from: dateKey(start), to: dateKey(ref) };
}

// Per-member aggregation from live bookings — fixes "visits" and adds booking
// spend on top of membership spend for "lifetime value".
//  - visits: counts every booking the member took part in (primary + co-players)
//  - bookingSpend: booking amount attributed to the primary member only, so
//    shared bookings are not double-counted across players.
export function memberBookingAgg(bookings = []) {
  const map = new Map();
  const ensure = (id) => {
    if (!map.has(id)) map.set(id, { visits: 0, bookingSpend: 0 });
    return map.get(id);
  };
  bookings.forEach((b) => {
    if (b.status === 'Cancelled') return;
    const players = new Set();
    if (b.memberId) players.add(b.memberId);
    (b.members || []).forEach((mm) => mm?.id && players.add(mm.id));
    players.forEach((id) => { ensure(id).visits += 1; });
    const primary = b.memberId || (b.members && b.members[0]?.id);
    if (primary) ensure(primary).bookingSpend += b.amount || 0;
  });
  return map;
}

// Revenue-vs-expense series across a custom range, INCLUDING booking revenue in
// income. Buckets by day for short ranges (≤62 days) or by month for longer ones.
export function revenueSeries(finance = [], bookings = [], from, to) {
  const allDates = [...finance.map((f) => f.date), ...bookings.map((b) => b.date)].filter(Boolean).sort();
  const start = from || allDates[0];
  const end = to || allDates[allDates.length - 1] || dateKey(new Date());
  if (!start) return [];
  const sd = new Date(start); sd.setHours(0, 0, 0, 0);
  const ed = new Date(end);   ed.setHours(0, 0, 0, 0);
  const spanDays = Math.floor((ed - sd) / 86400000) + 1;
  const live = bookings.filter((b) => b.status !== 'Cancelled');

  const sumFin = (pred) => {
    let income = 0, expense = 0;
    finance.forEach((f) => {
      if (!pred(f.date)) return;
      if (f.type === 'In') income += f.amount || 0;
      else if (f.type === 'Out') expense += f.amount || 0;
    });
    return { income, expense };
  };
  const sumBk = (pred) => live.reduce((s, b) => (pred(b.date) ? s + (b.amount || 0) : s), 0);

  const out = [];
  if (spanDays <= 62) {
    for (let i = 0; i < spanDays; i++) {
      const d = new Date(sd); d.setDate(sd.getDate() + i);
      const key = dateKey(d);
      const { income, expense } = sumFin((x) => x === key);
      const bk = sumBk((x) => x === key);
      out.push({ date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), income: income + bk, expense, net: income + bk - expense });
    }
  } else {
    let cur = new Date(sd.getFullYear(), sd.getMonth(), 1);
    const last = new Date(ed.getFullYear(), ed.getMonth(), 1);
    while (cur <= last) {
      const y = cur.getFullYear(), mo = cur.getMonth();
      const inMonth = (x) => {
        const dd = new Date(x);
        return dd.getFullYear() === y && dd.getMonth() === mo && x >= start && x <= end;
      };
      const { income, expense } = sumFin(inMonth);
      const bk = sumBk(inMonth);
      out.push({ date: cur.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), income: income + bk, expense, net: income + bk - expense });
      cur = new Date(y, mo + 1, 1);
    }
  }
  return out;
}

// Income-by-category for the pie chart, including a "Bookings" slice, scoped to
// a custom range.
export function incomeMix(finance = [], bookings = [], from, to) {
  const inR = inRangePred(from, to);
  const map = new Map();
  finance.forEach((f) => {
    if (f.type === 'In' && inR(f.date)) map.set(f.category, (map.get(f.category) || 0) + (f.amount || 0));
  });
  const bookingTotal = bookings
    .filter((b) => b.status !== 'Cancelled' && inR(b.date))
    .reduce((s, b) => s + (b.amount || 0), 0);
  if (bookingTotal > 0) map.set('Bookings', (map.get('Bookings') || 0) + bookingTotal);
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// Merged, newest-first activity feed (finance entries + bookings as income),
// scoped to a custom range.
export function recentActivity(finance = [], bookings = [], n = 6, from, to) {
  const inR = inRangePred(from, to);
  const items = [];
  finance.forEach((f) => {
    if (!inR(f.date)) return;
    items.push({ id: `f-${f.id}`, kind: f.type, category: f.category, description: f.description, amount: f.amount || 0, date: f.date, time: f.time || '' });
  });
  bookings.forEach((b) => {
    if (b.status === 'Cancelled' || !inR(b.date)) return;
    items.push({ id: `b-${b.id}`, kind: 'In', category: 'Booking', description: `Table ${b.tableNumber}${b.memberName ? ` · ${b.memberName}` : ''}`, amount: b.amount || 0, date: b.date, time: b.start || '' });
  });
  items.sort((a, b) => (a.date === b.date ? (b.time || '').localeCompare(a.time || '') : (a.date < b.date ? 1 : -1)));
  return items.slice(0, n);
}

// Member ID generator — same logic as staff side
export function generateMemberId(cnic, existingIds = []) {
  const digits = (cnic || '').replace(/\D/g, '');
  const last6 = digits.slice(-6).padStart(6, '0');
  for (let code = 65; code <= 90; code++) {
    const c = `${String.fromCharCode(code)}${last6}`;
    if (!existingIds.includes(c)) return c;
  }
  return `A${last6}`;
}

// Time / booking helpers
export function addMinutes(value, minutes) {
  const [h, m] = value.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  d.setMinutes(d.getMinutes() + minutes);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function buildIntervals(openTime = '11:00', closeTime = '23:00', stepMin = 15) {
  const [oh, om] = openTime.split(':').map(Number);
  const [ch, cm] = closeTime.split(':').map(Number);
  const start = new Date(); start.setHours(oh, om, 0, 0);
  const end   = new Date(); end.setHours(ch, cm, 0, 0);
  const out = [];
  const c = new Date(start);
  while (c < end) {
    out.push({
      value: `${String(c.getHours()).padStart(2, '0')}:${String(c.getMinutes()).padStart(2, '0')}`,
      label: format12h(c.getHours(), c.getMinutes()),
    });
    c.setMinutes(c.getMinutes() + stepMin);
  }
  return out;
}

export function format12h(h, m) {
  const hh = ((h + 11) % 12) + 1;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function intervalsForRange(startValue, minutes, stepMin = 15) {
  const [h, m] = startValue.split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  const total = Math.round(minutes / stepMin);
  const list = [];
  for (let i = 0; i < total; i++) {
    list.push(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    d.setMinutes(d.getMinutes() + stepMin);
  }
  return list;
}

export function bookedIntervalsFor(bookings, tableId, date, excludeBookingId = null) {
  const key = dateKey(date);
  const set = new Set();
  bookings.forEach((b) => {
    if (b.id === excludeBookingId) return;
    if (b.tableId === tableId && b.date === key && b.status !== 'Cancelled') {
      b.intervals?.forEach((iv) => set.add(iv));
    }
  });
  return set;
}

export function nextSevenDays() {
  const out = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push(d);
  }
  return out;
}
