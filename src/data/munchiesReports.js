// Aggregates real sales (receipts + receipt_lines) into the shapes the report
// pages render. Pure functions — the store fetches the rows and calls this.
import { WEEK_BUCKETS } from './munchiesData.js';

const ITEM_COLORS = ['#607D8B', '#7CB342', '#29B6F6', '#EC407A', '#FDD835', '#8E24AA', '#26A69A', '#FF7043'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isoDate = (ts) => (ts ? String(ts).slice(0, 10) : '');
const dayLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]}`;
};
const dateTimeLabel = (ts) => {
  const iso = isoDate(ts);
  const time = String(ts).slice(11, 16);
  return `${dayLabel(iso)} ${iso.slice(0, 4)}${time ? ' ' + time : ''}`;
};
const num = (v) => Number(v) || 0;
const metricCard = (value) => ({ value, delta: 0, trend: 0, betterWhenUp: true });

export function computeReports({ receipts = [], lines = [], items = [], categories = [], employees = [], customers = [] }) {
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const custById = Object.fromEntries(customers.map((c) => [c.id, c]));

  const sales = receipts.filter((r) => (r.type || 'Sale') === 'Sale');
  const refunds = receipts.filter((r) => r.type === 'Refund');

  const grossSales = sales.reduce((s, r) => s + num(r.subtotal), 0);
  const discountsTotal = sales.reduce((s, r) => s + num(r.discount), 0);
  const refundsTotal = refunds.reduce((s, r) => s + num(r.total), 0);
  const netSales = grossSales - discountsTotal - refundsTotal;

  const summary = {
    grossSales:  { ...metricCard(grossSales) },
    refunds:     { ...metricCard(refundsTotal), betterWhenUp: false },
    discounts:   { ...metricCard(discountsTotal), betterWhenUp: false },
    netSales:    { ...metricCard(netSales) },
    grossProfit: { ...metricCard(netSales) },
  };

  // ---- Daily series --------------------------------------------------------
  const dayMap = new Map();
  const bump = (iso, patch) => {
    const cur = dayMap.get(iso) || { date: iso, label: dayLabel(iso), gross: 0, refunds: 0, discount: 0 };
    Object.entries(patch).forEach(([k, v]) => { cur[k] += v; });
    dayMap.set(iso, cur);
  };
  sales.forEach((r) => bump(isoDate(r.created_at), { gross: num(r.subtotal), discount: num(r.discount) }));
  refunds.forEach((r) => bump(isoDate(r.created_at), { refunds: num(r.total) }));
  const daily = [...dayMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, net: d.gross - d.discount - d.refunds, cost: 0, grossProfit: d.gross - d.discount - d.refunds }));

  const dailyRows = [...daily].reverse();

  const summarySeries = (field, granularity) => {
    if (granularity === 'Weeks') {
      return WEEK_BUCKETS.map((w) => ({
        bucket: w.label,
        value: daily.filter((d) => d.date >= w.start && d.date <= w.end).reduce((s, d) => s + (d[field] || 0), 0),
      }));
    }
    return daily.map((d) => ({ bucket: d.label, value: d[field] || 0 }));
  };

  // ---- Items / categories --------------------------------------------------
  const itemAgg = new Map();
  const catAgg = new Map();
  lines.forEach((ln) => {
    const it = itemById[ln.item_id];
    const key = ln.item_id || ln.code || ln.name;
    const cur = itemAgg.get(key) || {
      code: ln.code || it?.code || '', name: ln.name || it?.name || 'Item',
      category: it ? (catById[it.categoryId]?.name || '—') : '—', sold: 0, net: 0, itemId: ln.item_id, date: isoDate(receiptDate(ln, receipts)),
    };
    cur.sold += num(ln.qty);
    cur.net += num(ln.line_total);
    itemAgg.set(key, cur);

    const catName = it ? (catById[it.categoryId]?.name || 'Uncategorized') : 'Uncategorized';
    const c = catAgg.get(catName) || { name: catName, sold: 0, net: 0 };
    c.sold += num(ln.qty);
    c.net += num(ln.line_total);
    catAgg.set(catName, c);
  });

  const itemRows = [...itemAgg.values()]
    .map((r) => ({ ...r, cost: 0, grossProfit: r.net }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const topItems = [...itemAgg.values()]
    .sort((a, b) => b.net - a.net)
    .slice(0, 5)
    .map((r, i) => ({ code: r.code, name: r.name, net: r.net, color: ITEM_COLORS[i % ITEM_COLORS.length] }));

  const categoryRows = [...catAgg.values()]
    .map((r) => ({ ...r, cost: 0, grossProfit: r.net }))
    .sort((a, b) => b.net - a.net);

  const itemPie = topItems.map((it) => ({ name: `${it.code} ${it.name}`, value: it.net, color: it.color }));

  // Weekly per-item series for the Sales-by-item chart.
  const lineDate = (ln) => isoDate(receiptDate(ln, receipts));
  const itemSeries = (granularity) => {
    const buckets = granularity === 'Days'
      ? daily.map((d) => ({ label: d.label, match: (iso) => iso === d.date }))
      : WEEK_BUCKETS.map((w) => ({ label: w.label, match: (iso) => iso >= w.start && iso <= w.end }));
    return buckets.map((b) => {
      const row = { bucket: b.label };
      topItems.forEach((it) => { row[it.name] = 0; });
      lines.forEach((ln) => {
        const nm = (ln.name || itemById[ln.item_id]?.name);
        if (row[nm] !== undefined && b.match(lineDate(ln))) row[nm] += num(ln.line_total);
      });
      return row;
    });
  };

  // ---- Employees -----------------------------------------------------------
  const empAgg = new Map();
  receipts.forEach((r) => {
    const name = empById[r.employee_id]?.name || 'Owner';
    const cur = empAgg.get(name) || { name, gross: 0, refunds: 0, discounts: 0, net: 0, receipts: 0, signups: 0 };
    if (r.type === 'Refund') { cur.refunds += num(r.total); }
    else { cur.gross += num(r.subtotal); cur.discounts += num(r.discount); }
    cur.receipts += 1;
    empAgg.set(name, cur);
  });
  const employeeRows = [...empAgg.values()].map((e) => {
    const net = e.gross - e.discounts - e.refunds;
    return { ...e, net, avgSale: e.receipts ? net / e.receipts : 0 };
  });

  // ---- Receipts ------------------------------------------------------------
  const receiptStats = { all: receipts.length, sales: sales.length, refunds: refunds.length };
  const receiptRows = [...receipts]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((r) => ({
      no: r.number || r.id,
      date: dateTimeLabel(r.created_at),
      employee: empById[r.employee_id]?.name || 'Owner',
      customer: custById[r.customer_id]?.name || '—',
      customerId: r.customer_id || null,
      type: r.type || 'Sale',
      total: num(r.total),
    }));

  // ---- Modifiers (flat by option) -----------------------------------------
  const modAgg = new Map();
  lines.forEach((ln) => {
    (ln.modifiers || []).forEach((m) => {
      const cur = modAgg.get(m.name) || { name: m.name, qty: 0, gross: 0, options: [] };
      cur.qty += num(ln.qty);
      cur.gross += num(m.price) * num(ln.qty);
      modAgg.set(m.name, cur);
    });
  });
  const modifierRows = [...modAgg.values()].sort((a, b) => a.name.localeCompare(b.name));

  // ---- Discounts -----------------------------------------------------------
  const discAgg = new Map();
  sales.forEach((r) => {
    if (!r.discount_name || num(r.discount) === 0) return;
    const cur = discAgg.get(r.discount_name) || { name: r.discount_name, applied: 0, amount: 0 };
    cur.applied += 1;
    cur.amount += num(r.discount);
    discAgg.set(r.discount_name, cur);
  });
  const discountReportRows = [...discAgg.values()].sort((a, b) => b.amount - a.amount);

  return {
    summary, daily, dailyRows, summarySeries,
    topItems, itemRows, categoryRows, itemPie, itemSeries,
    employeeRows, receiptStats, receiptRows, modifierRows, discountReportRows,
    hasData: receipts.length > 0,
  };
}

// Find the receipt a line belongs to (for per-line dates).
function receiptDate(line, receipts) {
  const r = receipts.find((x) => x.id === line.receipt_id);
  return r?.created_at || '';
}
