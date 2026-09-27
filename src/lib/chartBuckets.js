// Time buckets for the report charts (Sales summary, Sales by item).
// Granularity: 'Days' | 'Weeks' | 'Months' | 'Years'.
// All keys are built from plain 'YYYY-MM-DD' strings, so no time-zone drift.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parse = (iso) => { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };

/** The bucket a day belongs to: the day, its Monday, 'YYYY-MM' or 'YYYY'. */
export function bucketKey(iso, granularity) {
  if (!iso) return '';
  const day = String(iso).slice(0, 10);
  if (granularity === 'Years') return day.slice(0, 4);
  if (granularity === 'Months') return day.slice(0, 7);
  if (granularity === 'Weeks') {
    const d = parse(day);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // back to Monday
    return isoOf(d);
  }
  return day;
}

/** Axis label for a bucket key. `withYear` adds the year to day/week labels. */
export function bucketLabel(key, granularity, withYear = false) {
  if (granularity === 'Years') return key;
  if (granularity === 'Months') {
    const [y, m] = key.split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }
  const [y, m, d] = key.split('-').map(Number);
  const base = `${pad2(d)} ${MONTHS[m - 1]}`;
  const label = withYear ? `${base} ${String(y).slice(-2)}` : base;
  return granularity === 'Weeks' ? `w/c ${label}` : label;
}

// Every month / year between two keys, inclusive (so empty periods show as 0).
function fillKeys(first, last, granularity) {
  const out = [];
  if (granularity === 'Years') {
    for (let y = Number(first); y <= Number(last) && out.length < 500; y += 1) out.push(String(y));
    return out;
  }
  if (granularity === 'Months') {
    let [y, m] = first.split('-').map(Number);
    const [ly, lm] = last.split('-').map(Number);
    while ((y < ly || (y === ly && m <= lm)) && out.length < 1200) {
      out.push(`${y}-${pad2(m)}`);
      m += 1; if (m > 12) { m = 1; y += 1; }
    }
    return out;
  }
  if (granularity === 'Weeks') {
    const d = parse(first); const end = parse(last);
    while (d <= end && out.length < 1000) { out.push(isoOf(d)); d.setDate(d.getDate() + 7); }
    return out;
  }
  return [];
}

/** Does a set of ISO days span more than one calendar year? */
export const spansYears = (isos) => {
  const years = new Set(isos.filter(Boolean).map((i) => String(i).slice(0, 4)));
  return years.size > 1;
};

/**
 * Group day rows into chart buckets.
 *   days   : [{ date: 'YYYY-MM-DD', ...numbers }]  (any order)
 *   fields : { outKey: 'dayField' } — e.g. { value: 'gross', expenses: 'expenses' }
 * Returns [{ key, bucket, ...summed fields }] oldest first. Weeks / months /
 * years in between that had no data are included as 0.
 */
export function bucketDays(days, granularity, fields) {
  const g = granularity || 'Days';
  const sorted = [...(days || [])].filter((d) => d?.date).sort((a, b) => a.date.localeCompare(b.date));
  if (!sorted.length) return [];
  const withYear = spansYears(sorted.map((d) => d.date));
  const map = new Map();
  const blank = (key) => {
    const row = { key, bucket: bucketLabel(key, g, withYear) };
    Object.keys(fields).forEach((k) => { row[k] = 0; });
    return row;
  };
  if (g !== 'Days') {
    fillKeys(bucketKey(sorted[0].date, g), bucketKey(sorted[sorted.length - 1].date, g), g)
      .forEach((k) => map.set(k, blank(k)));
  }
  sorted.forEach((d) => {
    const k = bucketKey(d.date, g);
    const row = map.get(k) || blank(k);
    Object.entries(fields).forEach(([out, src]) => { row[out] += Number(d[src]) || 0; });
    map.set(k, row);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Bucket keys + labels for the item charts, from the period's day rows.
 * Returns [{ key, label }] oldest first.
 */
export function bucketList(isoDays, granularity) {
  const rows = bucketDays((isoDays || []).map((date) => ({ date })), granularity, {});
  return rows.map((r) => ({ key: r.key, label: r.bucket }));
}

/**
 * A sensible default granularity for a period length in days:
 *   up to ~2 months → Days, up to ~6 months → Weeks, up to ~3 years → Months,
 *   longer → Years.
 */
export function autoGranularity(spanDays) {
  if (!Number.isFinite(spanDays) || spanDays <= 62) return 'Days';
  if (spanDays <= 183) return 'Weeks';
  if (spanDays <= 1100) return 'Months';
  return 'Years';
}

/** Days between two ISO dates (inclusive). */
export function spanDaysOf(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  return Math.round((parse(endIso) - parse(startIso)) / 86400000) + 1;
}

/** Show at most ~`max` labels on the x-axis (recharts `interval`). */
export const tickIntervalFor = (count, max = 14) => (count > max ? Math.ceil(count / max) - 1 : 0);

/** Column header for exports: 'Day' | 'Week' | 'Month' | 'Year'. */
export const granularityUnit = (g) => ({ Weeks: 'Week', Months: 'Month', Years: 'Year' }[g] || 'Day');
