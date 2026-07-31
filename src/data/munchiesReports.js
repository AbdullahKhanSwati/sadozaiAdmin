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
const timeLabel = (ts) => String(ts).slice(11, 16);
const num = (v) => Number(v) || 0;
const metricCard = (value) => ({ value, delta: 0, trend: 0, betterWhenUp: true });

// A cancelled order stays in the list (audit trail) but counts for nothing.
export const isCancelled = (r) => (r?.status || 'completed') === 'cancelled';

export function computeReports({
  receipts = [], lines: allLines = [], items = [], categories = [], employees = [], customers = [], expenses = [],
}) {
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const empById = Object.fromEntries(employees.map((e) => [e.id, e]));
  const custById = Object.fromEntries(customers.map((c) => [c.id, c]));

  const live = receipts.filter((r) => !isCancelled(r));
  const liveIds = new Set(live.map((r) => r.id));
  // Every aggregate below works off lines belonging to non-cancelled receipts.
  const lines = allLines.filter((ln) => liveIds.has(ln.receipt_id));

  const sales = live.filter((r) => (r.type || 'Sale') === 'Sale');
  const refunds = live.filter((r) => r.type === 'Refund');

  // Per-line discounts (original − final), grouped by receipt and by name, so the
  // reports capture item-level discounts as well as whole-ticket ones.
  const lineDiscByReceipt = {};
  const lineDiscByName = {};
  lines.forEach((ln) => {
    const base = ln.base_total != null ? num(ln.base_total) : num(ln.line_total);
    const d = Math.max(0, base - num(ln.line_total));
    if (d > 0) {
      lineDiscByReceipt[ln.receipt_id] = (lineDiscByReceipt[ln.receipt_id] || 0) + d;
      const nm = ln.discount_name || 'Discount';
      const cur = lineDiscByName[nm] || { applied: 0, amount: 0 };
      cur.applied += 1; cur.amount += d;
      lineDiscByName[nm] = cur;
    }
  });

  const grossSales = sales.reduce((s, r) => s + num(r.subtotal), 0);
  const discountsTotal = sales.reduce((s, r) => s + num(r.discount) + (lineDiscByReceipt[r.id] || 0), 0);
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
    const cur = dayMap.get(iso) || { date: iso, label: dayLabel(iso), gross: 0, refunds: 0, discount: 0, expenses: 0 };
    Object.entries(patch).forEach(([k, v]) => { cur[k] += v; });
    dayMap.set(iso, cur);
  };
  sales.forEach((r) => bump(isoDate(r.created_at), { gross: num(r.subtotal), discount: num(r.discount) + (lineDiscByReceipt[r.id] || 0) }));
  refunds.forEach((r) => bump(isoDate(r.created_at), { refunds: num(r.total) }));
  expenses.forEach((e) => bump(isoDate(e.spent_on || e.created_at), { expenses: num(e.amount) }));
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
    const iso = isoDate(e.spent_on || e.created_at);
    if (!iso) return;
    const cat = e.category || 'Other';
    const key = `${iso}|${cat}`;
    const cur = expenseByDayCat.get(key) || { date: iso, label: dayLabel(iso), category: cat, amount: 0, count: 0 };
    cur.amount += num(e.amount);
    cur.count += 1;
    expenseByDayCat.set(key, cur);
  });
  const expenseDailyRows = [...expenseByDayCat.values()]
    .sort((a, b) => b.date.localeCompare(a.date) || a.category.localeCompare(b.category));

  const summarySeries = (field, granularity) => {
    if (granularity === 'Weeks') {
      return WEEK_BUCKETS.map((w) => {
        const inWeek = daily.filter((d) => d.date >= w.start && d.date <= w.end);
        return {
          bucket: w.label,
          value: inWeek.reduce((s, d) => s + (d[field] || 0), 0),
          expenses: inWeek.reduce((s, d) => s + (d.expenses || 0), 0),
        };
      });
    }
    return daily.map((d) => ({ bucket: d.label, value: d[field] || 0, expenses: d.expenses || 0 }));
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
  live.forEach((r) => {
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
      total: num(r.total),
    }));

  // ---- Receipt LINE rows (Loyverse-style "line by line" export) -------------
  // One row per item sold, carrying its receipt's header fields. Cancelled
  // receipts are included but flagged, so the export still reconciles.
  const rowByReceiptId = Object.fromEntries(receiptRows.map((r) => [r.id, r]));
  const receiptLineRows = allLines
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
        receiptTotal: head.total,
      };
    })
    .filter(Boolean)
    .sort((a, b) => `${b.isoDate} ${b.time}`.localeCompare(`${a.isoDate} ${a.time}`) || String(b.no).localeCompare(String(a.no)));

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
  sales.forEach((r) => addDisc(r.discount_name, 1, num(r.discount)));
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
  allLines.forEach((ln) => { (linesByReceipt[ln.receipt_id] = linesByReceipt[ln.receipt_id] || []).push(ln); });
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
    summary, daily, dailyRows, summarySeries, expenseDailyRows,
    topItems, itemRows, categoryRows, itemPie, itemSeries,
    employeeRows, receiptStats, receiptRows, receiptLineRows, modifierRows, discountReportRows,
    customerStats, receiptById,
    hasData: receipts.length > 0,
  };
}

// Find the receipt a line belongs to (for per-line dates).
function receiptDate(line, receipts) {
  const r = receipts.find((x) => x.id === line.receipt_id);
  return r?.created_at || '';
}
