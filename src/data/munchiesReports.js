// Aggregates real sales (receipts + receipt_lines) into the shapes the report
// pages render. Pure functions — the store fetches the rows and calls this.
import { compareNatural, sortByOrder } from '../lib/naturalSort.js';

const ITEM_COLORS = ['#607D8B', '#7CB342', '#29B6F6', '#EC407A', '#FDD835', '#8E24AA', '#26A69A', '#FF7043'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad2 = (n) => String(n).padStart(2, '0');

// Timestamps come back from Supabase in UTC. Every date/time the reports show
// or filter on is the LOCAL day/time (same as the app and the printed receipt),
// so a sale rung up at 20:20 lands on that day, not on the UTC one.
const toDate = (ts) => {
  if (!ts) return null;
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
};
export const isoDate = (ts) => {
  const d = toDate(ts);
  return d ? `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` : '';
};
const timeLabel = (ts) => {
  const d = toDate(ts);
  return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
};
// Plain calendar dates (expenses.spent_on = 'YYYY-MM-DD') are used as-is.
const isoDay = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : isoDate(v));
const dayLabel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return `${pad2(d)} ${MONTHS[m - 1]}`;
};
const dateTimeLabel = (ts) => {
  const iso = isoDate(ts);
  const time = timeLabel(ts);
  return iso ? `${dayLabel(iso)} ${iso.slice(0, 4)}${time ? ' ' + time : ''}` : '';
};
const num = (v) => Number(v) || 0;
const metricCard = (value) => ({ value, delta: 0, trend: 0, betterWhenUp: true });

// A cancelled order stays in the list (audit trail) but counts for nothing.
export const isCancelled = (r) => (r?.status || 'completed') === 'cancelled';

// Is an ISO day inside the range? Empty / 'all' means everything.
export const inRange = (iso, range) => {
  if (!range || range.key === 'all' || (!range.start && !range.end)) return true;
  if (!iso) return false;
  return (!range.start || iso >= range.start) && (!range.end || iso <= range.end);
};

// Monday-based ISO-week buckets over a list of daily rows (oldest first).
export function weekBuckets(days) {
  const buckets = new Map();
  days.forEach((d) => {
    const dt = new Date(`${d.date}T00:00:00`);
    const dow = (dt.getDay() + 6) % 7;
    const monday = new Date(dt); monday.setDate(dt.getDate() - dow);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const key = isoDate(monday);
    if (!buckets.has(key)) {
      buckets.set(key, {
        key, start: key, end: isoDate(sunday),
        label: `${dayLabel(key)} - ${dayLabel(isoDate(sunday))}`,
        days: [],
      });
    }
    buckets.get(key).days.push(d);
  });
  return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function computeReports({
  receipts: allReceipts = [], lines: allLines = [], items = [], categories = [], modifiers = [],
  employees = [], customers = [], expenses: allExpenses = [], range = null,
}) {
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const custById = Object.fromEntries(customers.map((c) => [c.id, c]));

  // ---- Period scope ---------------------------------------------------------
  const receipts = allReceipts.filter((r) => inRange(isoDate(r.created_at), range));
  const expenses = allExpenses.filter((e) => inRange(isoDay(e.spent_on || e.created_at), range));
  const receiptIds = new Set(receipts.map((r) => r.id));
  const periodLines = allLines.filter((ln) => receiptIds.has(ln.receipt_id));

  const live = receipts.filter((r) => !isCancelled(r));
  const liveIds = new Set(live.map((r) => r.id));
  // Every aggregate below works off lines belonging to non-cancelled receipts.
  const lines = periodLines.filter((ln) => liveIds.has(ln.receipt_id));

  const sales = live.filter((r) => (r.type || 'Sale') === 'Sale');
  const refunds = live.filter((r) => r.type === 'Refund');

  // Per-line discounts (original − final), grouped by receipt and by name, so the
  // reports capture item-level discounts as well as whole-ticket ones.
  // Computed over ALL period lines (cancelled included) so the receipt list can
  // still show what was discounted on a voided order.
  const lineDiscByReceipt = {};
  const lineDiscNamesByReceipt = {};
  const lineDiscByName = {};
  periodLines.forEach((ln) => {
    const base = ln.base_total != null ? num(ln.base_total) : num(ln.line_total);
    const d = Math.max(0, base - num(ln.line_total));
    if (d > 0) {
      lineDiscByReceipt[ln.receipt_id] = (lineDiscByReceipt[ln.receipt_id] || 0) + d;
      const nm = ln.discount_name || 'Discount';
      (lineDiscNamesByReceipt[ln.receipt_id] = lineDiscNamesByReceipt[ln.receipt_id] || new Set()).add(nm);
      if (liveIds.has(ln.receipt_id)) {
        const cur = lineDiscByName[nm] || { applied: 0, amount: 0 };
        cur.applied += 1; cur.amount += d;
        lineDiscByName[nm] = cur;
      }
    }
  });
  // Total discount on a receipt = whole-ticket discount + every per-item discount.
  const receiptDiscount = (r) => num(r.discount) + (lineDiscByReceipt[r.id] || 0);
  const receiptDiscountNames = (r) => {
    const names = [];
    if (num(r.discount) > 0) names.push(r.discount_name || 'Discount');
    (lineDiscNamesByReceipt[r.id] || new Set()).forEach((nm) => { if (!names.includes(nm)) names.push(nm); });
    return names.join(', ');
  };

  const grossSales = sales.reduce((s, r) => s + num(r.subtotal), 0);
  const discountsTotal = sales.reduce((s, r) => s + receiptDiscount(r), 0);
  const refundsTotal = refunds.reduce((s, r) => s + num(r.total), 0);
  const netSales = grossSales - discountsTotal - refundsTotal;
  const expensesTotal = expenses.reduce((s, e) => s + num(e.amount), 0);
  const netProfit = netSales - expensesTotal;

  const summary = {
    grossSales:  { ...metricCard(grossSales) },
    refunds:     { ...metricCard(refundsTotal), betterWhenUp: false },
    discounts:   { ...metricCard(discountsTotal), betterWhenUp: false },
    netSales:    { ...metricCard(netSales) },
    expenses:    { ...metricCard(expensesTotal), betterWhenUp: false },
    netProfit:   { ...metricCard(netProfit) },
    grossProfit: { ...metricCard(netSales) },
  };

  // ---- Daily series --------------------------------------------------------
  // One row per day covering BOTH sides of the ledger: sales from receipts and
  // costs from the expenses table, summarised by the day they were spent on.
  const dayMap = new Map();
  const bump = (iso, patch) => {
    if (!iso) return;
    const cur = dayMap.get(iso) || { date: iso, label: dayLabel(iso), gross: 0, refunds: 0, discount: 0, expenses: 0, receipts: 0 };
    Object.entries(patch).forEach(([k, v]) => { cur[k] += v; });
    dayMap.set(iso, cur);
  };
  sales.forEach((r) => bump(isoDate(r.created_at), { gross: num(r.subtotal), discount: receiptDiscount(r), receipts: 1 }));
  refunds.forEach((r) => bump(isoDate(r.created_at), { refunds: num(r.total) }));
  expenses.forEach((e) => bump(isoDay(e.spent_on || e.created_at), { expenses: num(e.amount) }));
  const daily = [...dayMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => {
      const net = d.gross - d.discount - d.refunds;
      return { ...d, net, cost: 0, grossProfit: net, netProfit: net - d.expenses };
    });

  const dailyRows = [...daily].reverse();

  // Expenses grouped by day *and* category — the breakdown under the summary.
  const expenseByDayCat = new Map();
  expenses.forEach((e) => {
    const iso = isoDay(e.spent_on || e.created_at);
    if (!iso) return;
    const cat = e.category || 'Other';
    const key = `${iso}|${cat}`;
    const cur = expenseByDayCat.get(key) || { date: iso, label: dayLabel(iso), category: cat, amount: 0, count: 0 };
    cur.amount += num(e.amount);
    cur.count += 1;
    expenseByDayCat.set(key, cur);
  });
  const expenseDailyRows = [...expenseByDayCat.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || compareNatural(a.category, b.category));

  // Expenses grouped by category only (period totals).
  const expenseByCat = new Map();
  expenses.forEach((e) => {
    const cat = e.category || 'Other';
    const cur = expenseByCat.get(cat) || { category: cat, amount: 0, count: 0 };
    cur.amount += num(e.amount); cur.count += 1;
    expenseByCat.set(cat, cur);
  });
  const expenseCategoryRows = [...expenseByCat.values()].sort((a, b) => b.amount - a.amount);

  const summarySeries = (field, granularity) => {
    if (granularity === 'Weeks') {
      return weekBuckets(daily).map((w) => ({
        bucket: w.label,
        value: w.days.reduce((s, d) => s + (d[field] || 0), 0),
        expenses: w.days.reduce((s, d) => s + (d.expenses || 0), 0),
      }));
    }
    return daily.map((d) => ({ bucket: d.label, value: d[field] || 0, expenses: d.expenses || 0 }));
  };

  // ---- Items / categories --------------------------------------------------
  const receiptById0 = Object.fromEntries(receipts.map((r) => [r.id, r]));
  const lineDate = (ln) => isoDate(receiptById0[ln.receipt_id]?.created_at);

  const itemAgg = new Map();
  const catAgg = new Map();
  lines.forEach((ln) => {
    const it = itemById[ln.item_id];
    const key = ln.item_id || ln.code || ln.name;
    const cur = itemAgg.get(key) || {
      code: ln.code || it?.code || '', name: ln.name || it?.name || 'Item',
      category: it ? (catById[it.categoryId]?.name || '—') : '—', sold: 0, net: 0, gross: 0, discount: 0, itemId: ln.item_id, date: lineDate(ln),
    };
    const base = ln.base_total != null ? num(ln.base_total) : num(ln.line_total);
    cur.sold += num(ln.qty);
    cur.net += num(ln.line_total);
    cur.gross += base;
    cur.discount += Math.max(0, base - num(ln.line_total));
    itemAgg.set(key, cur);

    const catName = it ? (catById[it.categoryId]?.name || 'Uncategorized') : 'Uncategorized';
    const c = catAgg.get(catName) || { name: catName, sold: 0, net: 0, gross: 0, discount: 0 };
    c.sold += num(ln.qty);
    c.net += num(ln.line_total);
    c.gross += base;
    c.discount += Math.max(0, base - num(ln.line_total));
    catAgg.set(catName, c);
  });

  // Menu order everywhere (1.1 < 1.2.1 < 1.10 < 2.1 …), same as the item list.
  const itemRows = [...itemAgg.values()]
    .map((r) => ({ ...r, cost: 0, grossProfit: r.net }))
    .sort((a, b) => compareNatural(`${a.code} ${a.name}`, `${b.code} ${b.name}`));

  const topItems = [...itemAgg.values()]
    .sort((a, b) => b.net - a.net)
    .slice(0, 5)
    .map((r, i) => ({ code: r.code, name: r.name, net: r.net, color: ITEM_COLORS[i % ITEM_COLORS.length] }));

  const categoryRows = [...catAgg.values()]
    .map((r) => ({ ...r, cost: 0, grossProfit: r.net }))
    .sort((a, b) => compareNatural(a.name, b.name));

  const itemPie = topItems.map((it) => ({ name: `${it.code} ${it.name}`, value: it.net, color: it.color }));

  // Per-item series for the Sales-by-item chart (top 5), by day or real week.
  const itemSeries = (granularity) => {
    const buckets = granularity === 'Weeks'
      ? weekBuckets(daily).map((w) => ({ label: w.label, match: (iso) => iso >= w.start && iso <= w.end }))
      : daily.map((d) => ({ label: d.label, match: (iso) => iso === d.date }));
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
  live.forEach((r) => {
    const name = empById[r.employee_id]?.name || 'Owner';
    const cur = empAgg.get(name) || { name, gross: 0, refunds: 0, discounts: 0, net: 0, receipts: 0, signups: 0 };
    if (r.type === 'Refund') { cur.refunds += num(r.total); }
    else { cur.gross += num(r.subtotal); cur.discounts += receiptDiscount(r); }
    cur.receipts += 1;
    empAgg.set(name, cur);
  });
  const employeeRows = [...empAgg.values()].map((e) => {
    const net = e.gross - e.discounts - e.refunds;
    return { ...e, net, avgSale: e.receipts ? net / e.receipts : 0 };
  });

  // ---- Receipts ------------------------------------------------------------
  const cancelledReceipts = receipts.filter(isCancelled);
  const receiptStats = {
    all: receipts.length,
    sales: sales.length,
    refunds: refunds.length,
    cancelled: cancelledReceipts.length,
  };
  const receiptRows = [...receipts]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((r) => ({
      id: r.id,
      no: r.number || r.id,
      date: dateTimeLabel(r.created_at),
      isoDate: isoDate(r.created_at),
      time: timeLabel(r.created_at),
      employee: empById[r.employee_id]?.name || 'Owner',
      customer: custById[r.customer_id]?.name || '—',
      customerId: r.customer_id || null,
      dining: r.dining || '',
      type: r.type || 'Sale',
      status: isCancelled(r) ? 'Cancelled' : 'Completed',
      cancelled: isCancelled(r),
      cancelReason: r.cancel_reason || '',
      cancelledAt: r.cancelled_at ? dateTimeLabel(r.cancelled_at) : '',
      gross: num(r.subtotal),
      discount: receiptDiscount(r),
      discountName: receiptDiscountNames(r),
      total: num(r.total),
    }));

  // ---- Receipt LINE rows (Loyverse-style "line by line" export) -------------
  // One row per item sold, carrying its receipt's header fields. Cancelled
  // receipts are included but flagged, so the export still reconciles.
  const rowByReceiptId = Object.fromEntries(receiptRows.map((r) => [r.id, r]));
  const receiptLineRows = periodLines
    .map((ln) => {
      const head = rowByReceiptId[ln.receipt_id];
      if (!head) return null;
      const base = ln.base_total != null ? num(ln.base_total) : num(ln.line_total);
      const it = itemById[ln.item_id];
      return {
        receiptId: ln.receipt_id,
        no: head.no,
        isoDate: head.isoDate,
        time: head.time,
        date: head.date,
        employee: head.employee,
        customer: head.customer === '—' ? '' : head.customer,
        dining: head.dining,
        type: head.type,
        status: head.status,
        code: ln.code || it?.code || '',
        name: ln.name || it?.name || 'Item',
        category: it ? (catById[it.categoryId]?.name || '') : '',
        modifiers: (ln.modifiers || []).map((m) => `${m.name}${num(m.price) ? ` (${num(m.price)})` : ''}`).join(' + '),
        qty: num(ln.qty),
        unit: num(ln.unit),
        grossTotal: base,
        discount: Math.max(0, base - num(ln.line_total)),
        discountName: ln.discount_name || '',
        netTotal: num(ln.line_total),
        receiptDiscount: head.discount,
        receiptTotal: head.total,
      };
    })
    .filter(Boolean)
    .sort((a, b) => `${b.isoDate} ${b.time}`.localeCompare(`${a.isoDate} ${a.time}`) || String(b.no).localeCompare(String(a.no)));

  // ---- Modifiers (flat by option) -----------------------------------------
  // Listed in the admin's modifier order; options that no longer belong to a
  // known modifier come last, alphabetically.
  const optionOrder = new Map();
  sortByOrder(modifiers).forEach((m, mi) => {
    (m.options || []).forEach((o, oi) => { if (!optionOrder.has(o.name)) optionOrder.set(o.name, mi * 1000 + oi); });
  });
  const modAgg = new Map();
  lines.forEach((ln) => {
    (ln.modifiers || []).forEach((m) => {
      const cur = modAgg.get(m.name) || { name: m.name, qty: 0, gross: 0, options: [] };
      cur.qty += num(ln.qty);
      cur.gross += num(m.price) * num(ln.qty);
      modAgg.set(m.name, cur);
    });
  });
  const modifierRows = [...modAgg.values()].sort((a, b) => {
    const oa = optionOrder.has(a.name) ? optionOrder.get(a.name) : Number.MAX_SAFE_INTEGER;
    const ob = optionOrder.has(b.name) ? optionOrder.get(b.name) : Number.MAX_SAFE_INTEGER;
    return oa - ob || a.name.localeCompare(b.name);
  });

  // ---- Discounts -----------------------------------------------------------
  // Whole-ticket discounts (receipt.discount) + per-line item discounts, keyed
  // by discount name.
  const discAgg = new Map();
  const addDisc = (name, applied, amount) => {
    if (!name || amount === 0) return;
    const cur = discAgg.get(name) || { name, applied: 0, amount: 0 };
    cur.applied += applied;
    cur.amount += amount;
    discAgg.set(name, cur);
  };
  sales.forEach((r) => { if (num(r.discount) > 0) addDisc(r.discount_name || 'Discount', 1, num(r.discount)); });
  Object.entries(lineDiscByName).forEach(([nm, v]) => addDisc(nm, v.applied, v.amount));
  const discountReportRows = [...discAgg.values()].sort((a, b) => b.amount - a.amount);

  // ---- Per-customer stats (derived from real receipts, not stored columns) --
  const customerStats = {};
  sales.forEach((r) => {
    if (!r.customer_id) return;
    const cur = customerStats[r.customer_id] || { visits: 0, spent: 0, firstVisit: null, lastVisit: null };
    cur.visits += 1;
    cur.spent += num(r.total);
    const iso = isoDate(r.created_at);
    if (iso) {
      if (!cur.firstVisit || iso < cur.firstVisit) cur.firstVisit = iso;
      if (!cur.lastVisit || iso > cur.lastVisit) cur.lastVisit = iso;
    }
    customerStats[r.customer_id] = cur;
  });

  // ---- Receipt detail lookup (for the clickable receipt modal) -------------
  const linesByReceipt = {};
  periodLines.forEach((ln) => { (linesByReceipt[ln.receipt_id] = linesByReceipt[ln.receipt_id] || []).push(ln); });
  const receiptById = {};
  receipts.forEach((r) => {
    receiptById[r.id] = {
      id: r.id,
      no: r.number || r.id,
      date: dateTimeLabel(r.created_at),
      employee: empById[r.employee_id]?.name || 'Owner',
      customer: custById[r.customer_id]?.name || '',
      dining: r.dining || '',
      type: r.type || 'Sale',
      cancelled: isCancelled(r),
      cancelReason: r.cancel_reason || '',
      cancelledAt: r.cancelled_at ? dateTimeLabel(r.cancelled_at) : '',
      subtotal: num(r.subtotal),
      discount: num(r.discount),
      discountName: r.discount_name || '',
      totalDiscount: receiptDiscount(r),
      total: num(r.total),
      lines: (linesByReceipt[r.id] || []).map((ln) => ({
        code: ln.code || '', name: ln.name || '', qty: num(ln.qty), unit: num(ln.unit),
        lineTotal: num(ln.line_total),
        baseTotal: ln.base_total != null ? num(ln.base_total) : num(ln.line_total),
        discountName: ln.discount_name || '',
        mods: Array.isArray(ln.modifiers) ? ln.modifiers : [],
      })),
    };
  });

  return {
    range,
    summary, daily, dailyRows, summarySeries, expenseDailyRows, expenseCategoryRows,
    topItems, itemRows, categoryRows, itemPie, itemSeries,
    employeeRows, receiptStats, receiptRows, receiptLineRows, modifierRows, discountReportRows,
    customerStats, receiptById,
    hasData: receipts.length > 0,
  };
}
