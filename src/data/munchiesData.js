// Munchies admin — mock report data (UI only, no backend yet).
// Numbers mirror the Loyverse dashboard screenshots so the reports look real.
// Later this can be swapped for live Supabase queries.

// ---- Currency ------------------------------------------------------------
export function rs(n) {
  const v = Number(n) || 0;
  return 'Rs' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Compact "Rs40,000.00" style used on chart axes.
export function rsAxis(n) {
  const v = Number(n) || 0;
  return 'Rs' + v.toLocaleString('en-US');
}

// ---- Report period (matches screenshots) ---------------------------------
export const REPORT_PERIOD = {
  label: '5 Jun 2026 - 4 Jul 2026',
  time: '00:00 - 23:00',
};

// ---- Sales summary -------------------------------------------------------
// Period totals shown on the summary stat cards. `delta` is the absolute change
// vs the previous period; `betterWhenUp` decides red/green for the delta.
export const salesSummary = {
  grossSales:  { value: 488120, delta: -14400, trend: -2.87, betterWhenUp: true },
  refunds:     { value: 0,      delta: 0,      trend: 0,     betterWhenUp: false },
  discounts:   { value: 62338,  delta: 16340,  trend: 35.52, betterWhenUp: false },
  netSales:    { value: 425782, delta: -30740, trend: -6.73, betterWhenUp: true },
  grossProfit: { value: 425782, delta: -30740, trend: -6.73, betterWhenUp: true },
};

// The summary tabs, in order. `field` maps to the daily-row key charted.
export const SUMMARY_METRICS = [
  { key: 'grossSales',  label: 'Gross sales',  field: 'gross' },
  { key: 'discounts',   label: 'Discounts',    field: 'discount' },
  { key: 'grossProfit', label: 'Gross profit', field: 'grossProfit' },
];

// Daily breakdown (5 Jun → 4 Jul). gross drives the chart; net = gross - discount.
const RAW_DAILY = [
  ['2026-06-05', '05 Jun', 26000, 3100],
  ['2026-06-06', '06 Jun', 23000, 2600],
  ['2026-06-07', '07 Jun', 35000, 4200],
  ['2026-06-08', '08 Jun', 10000, 1150],
  ['2026-06-09', '09 Jun', 11500, 1300],
  ['2026-06-10', '10 Jun', 20500, 2500],
  ['2026-06-11', '11 Jun', 9000, 1050],
  ['2026-06-12', '12 Jun', 10000, 1200],
  ['2026-06-13', '13 Jun', 17000, 2050],
  ['2026-06-14', '14 Jun', 16500, 1980],
  ['2026-06-15', '15 Jun', 13000, 1560],
  ['2026-06-16', '16 Jun', 14000, 1700],
  ['2026-06-17', '17 Jun', 25500, 3100],
  ['2026-06-18', '18 Jun', 19000, 2280],
  ['2026-06-19', '19 Jun', 21000, 2520],
  ['2026-06-20', '20 Jun', 20000, 2400],
  ['2026-06-21', '21 Jun', 13000, 1560],
  ['2026-06-22', '22 Jun', 9000, 1080],
  ['2026-06-23', '23 Jun', 10500, 1260],
  ['2026-06-24', '24 Jun', 10000, 1200],
  ['2026-06-25', '25 Jun', 31000, 3760],
  ['2026-06-26', '26 Jun', 20500, 2460],
  ['2026-06-27', '27 Jun', 13000, 1560],
  ['2026-06-28', '28 Jun', 4500, 540],
  ['2026-06-29', '29 Jun', 14430, 810],
  ['2026-06-30', '30 Jun', 24370, 2582],
  ['2026-07-01', '01 Jul', 17500, 3020],
  ['2026-07-02', '02 Jul', 5540, 666],
  ['2026-07-03', '03 Jul', 18730, 1920],
  ['2026-07-04', '04 Jul', 0, 0],
];

export const dailySales = RAW_DAILY.map(([date, label, gross, discount]) => ({
  date,
  label,
  gross,
  refunds: 0,
  discount,
  net: gross - discount,
  cost: 0,
  grossProfit: gross - discount,
}));

// Table rows are shown newest-first (like the Loyverse export table).
export const dailySalesRows = [...dailySales].reverse();

// Week ranges spanning the report period (used by the chart granularity toggles).
export const WEEK_BUCKETS = [
  { start: '2026-06-05', end: '2026-06-07', label: '05 Jun - 07 Jun' },
  { start: '2026-06-08', end: '2026-06-14', label: '08 Jun - 14 Jun' },
  { start: '2026-06-15', end: '2026-06-21', label: '15 Jun - 21 Jun' },
  { start: '2026-06-22', end: '2026-06-28', label: '22 Jun - 28 Jun' },
  { start: '2026-06-29', end: '2026-07-04', label: '29 Jun - 04 Jul' },
];

// Only Days & Weeks make sense for a ~1-month range; the rest are greyed out
// in the dropdown (mirrors Loyverse for this period).
export const GRANULARITY_OPTIONS = [
  { value: 'Hours', disabled: true },
  { value: 'Days', disabled: false },
  { value: 'Weeks', disabled: false },
  { value: 'Months', disabled: true },
  { value: 'Quarters', disabled: true },
  { value: 'Years', disabled: true },
];

export const SUMMARY_CHART_TYPES = ['Area', 'Line', 'Bar'];
export const ITEM_CHART_TYPES = ['Line', 'Bar', 'Pie'];

// Series for the Sales-summary chart: one metric, bucketed by granularity.
export function summarySeries(field, granularity) {
  if (granularity === 'Weeks') {
    return WEEK_BUCKETS.map((w) => ({
      bucket: w.label,
      value: dailySales
        .filter((d) => d.date >= w.start && d.date <= w.end)
        .reduce((s, d) => s + d[field], 0),
    }));
  }
  return dailySales.map((d) => ({ bucket: d.label, value: d[field] }));
}

// ---- Sales by item -------------------------------------------------------
export const topItems = [
  { code: '4.4', name: 'Extra Large Pizza',  net: 91230, color: '#607D8B' },
  { code: '4.3', name: 'Large Pizza',        net: 57940, color: '#7CB342' },
  { code: '4.2', name: 'Medium Pizza',       net: 52330, color: '#29B6F6' },
  { code: '1.7.2', name: 'Jumbo Zinger Burger', net: 40830, color: '#EC407A' },
  { code: '4.1', name: 'Small Pizza',        net: 17450, color: '#FDD835' },
];

// Weekly series for the top-5 line chart.
export const itemWeeklySeries = [
  { week: '05 Jun - 07 Jun', 'Extra Large Pizza': 20500, 'Large Pizza': 11500, 'Medium Pizza': 4200, 'Jumbo Zinger Burger': 4500, 'Small Pizza': 2600 },
  { week: '08 Jun - 14 Jun', 'Extra Large Pizza': 12500, 'Large Pizza': 12800, 'Medium Pizza': 10500, 'Jumbo Zinger Burger': 6200, 'Small Pizza': 2900 },
  { week: '15 Jun - 21 Jun', 'Extra Large Pizza': 28500, 'Large Pizza': 15200, 'Medium Pizza': 18500, 'Jumbo Zinger Burger': 12500, 'Small Pizza': 4600 },
  { week: '22 Jun - 28 Jun', 'Extra Large Pizza': 14500, 'Large Pizza': 11200, 'Medium Pizza': 9300, 'Jumbo Zinger Burger': 8200, 'Small Pizza': 3900 },
  { week: '29 Jun - 04 Jul', 'Extra Large Pizza': 13500, 'Large Pizza': 10500, 'Medium Pizza': 8600, 'Jumbo Zinger Burger': 9800, 'Small Pizza': 3200 },
];

// Series for the Sales-by-item stacked chart, bucketed by granularity.
// Weeks uses the fixed weekly data above; Days distributes each week's per-item
// total across its days in proportion to that day's gross sales.
export function itemSeries(granularity) {
  if (granularity !== 'Days') {
    return itemWeeklySeries.map(({ week, ...rest }) => ({ bucket: week, ...rest }));
  }
  const rows = [];
  WEEK_BUCKETS.forEach((w, wi) => {
    const wk = itemWeeklySeries[wi] || {};
    const days = dailySales.filter((d) => d.date >= w.start && d.date <= w.end);
    const wkGross = days.reduce((s, d) => s + d.gross, 0) || 1;
    days.forEach((d) => {
      const row = { bucket: d.label };
      topItems.forEach((it) => {
        row[it.name] = Math.round((wk[it.name] || 0) * (d.gross / wkGross));
      });
      rows.push(row);
    });
  });
  return rows;
}

// Pie slices = each top item's share of net sales for the whole period.
export const itemPie = topItems.map((it) => ({
  name: `${it.code} ${it.name}`,
  value: it.net,
  color: it.color,
}));

// Full item table (Item, Category, Items sold, Net sales, Cost of goods, Gross profit).
export const itemRows = [
  { code: '1.1', name: 'Crispy Burger', category: '1 Burgers', sold: 4, net: 2000 },
  { code: '1.2.1', name: 'Chicken Chapli Burger', category: '1 Burgers', sold: 2, net: 900 },
  { code: '1.2.2', name: 'Beef Chapli Burger', category: '1 Burgers', sold: 1, net: 470 },
  { code: '1.3', name: 'Chicken Tikka Burger', category: '1 Burgers', sold: 5, net: 2250 },
  { code: '1.4', name: 'Jumbo Crispy Burger', category: '1 Burgers', sold: 2, net: 0 },
  { code: '1.5.2', name: 'Zinger Burger', category: '1 Burgers', sold: 24, net: 13400 },
  { code: '1.6', name: 'Munchies Grilled Burger', category: '1 Burgers', sold: 24, net: 8400 },
  { code: '1.7.2', name: 'Jumbo Zinger Burger', category: '1 Burgers', sold: 65, net: 40830 },
  { code: '1.9.2', name: 'Fried Chicken (3 pc)', category: '1.9 Fried Chicken', sold: 8, net: 3910 },
  { code: '2.1', name: 'Regular Fries', category: '2 Fries', sold: 40, net: 16590 },
  { code: '2.1.2', name: 'Loaded Fries', category: '2 Fries', sold: 18, net: 10000 },
  { code: '2.2.1', name: 'Soft Drink Regular', category: '2.2 Drinks', sold: 137, net: 19732 },
  { code: '2.5', name: 'Special Sauce', category: '2.5 Sauces', sold: 11, net: 520 },
  { code: '4.1', name: 'Small Pizza', category: '4 Pizza', sold: 22, net: 17450 },
  { code: '4.2', name: 'Medium Pizza', category: '4 Pizza', sold: 44, net: 52330 },
  { code: '4.3', name: 'Large Pizza', category: '4 Pizza', sold: 39, net: 57940 },
  { code: '4.4', name: 'Extra Large Pizza', category: '4 Pizza', sold: 46, net: 91230 },
].map((r) => ({ ...r, cost: 0, grossProfit: r.net }));

// ---- Sales by category ---------------------------------------------------
export const categoryRows = [
  { name: '1 Burgers', sold: 135, net: 74740 },
  { name: '1.9 Fried Chicken', sold: 8, net: 3910 },
  { name: '2 Fries', sold: 58, net: 26590 },
  { name: '2.2 Drinks', sold: 137, net: 19732 },
  { name: '2.5 Sauces', sold: 11, net: 520 },
  { name: '3 Finger Food', sold: 22, net: 11250 },
  { name: '4 Pizza', sold: 151, net: 218950 },
].map((r) => ({ ...r, cost: 0, grossProfit: r.net }));

// ---- Sales by employee ---------------------------------------------------
export const employeeRows = [
  {
    name: 'Owner',
    gross: 488120,
    refunds: 0,
    discounts: 62338,
    net: 425782,
    receipts: 239,
    avgSale: 1781.51,
    signups: 7,
  },
];

// ---- Receipts ------------------------------------------------------------
export const receiptStats = { all: 242, sales: 242, refunds: 0 };

export const receiptRows = [
  { no: '3-3987', date: '03 Jul 2026 21:41', employee: 'Owner', customer: '—', type: 'Sale', total: 800 },
  { no: '3-3986', date: '03 Jul 2026 20:37', employee: 'Owner', customer: '—', type: 'Sale', total: 220 },
  { no: '3-3985', date: '03 Jul 2026 20:31', employee: 'Owner', customer: '—', type: 'Sale', total: 1950 },
  { no: '3-3984', date: '03 Jul 2026 20:29', employee: 'Owner', customer: '—', type: 'Sale', total: 650 },
  { no: '3-3983', date: '03 Jul 2026 20:04', employee: 'Owner', customer: '—', type: 'Sale', total: 1400 },
  { no: '3-3982', date: '03 Jul 2026 19:47', employee: 'Owner', customer: 'Aqib', type: 'Sale', total: 2700 },
  { no: '3-3981', date: '03 Jul 2026 19:22', employee: 'Owner', customer: '—', type: 'Sale', total: 990 },
  { no: '3-3980', date: '03 Jul 2026 18:58', employee: 'Owner', customer: '—', type: 'Sale', total: 1600 },
  { no: '3-3979', date: '03 Jul 2026 18:31', employee: 'Owner', customer: '—', type: 'Sale', total: 450 },
  { no: '3-3978', date: '03 Jul 2026 18:05', employee: 'Owner', customer: '—', type: 'Sale', total: 1200 },
  { no: '3-3977', date: '02 Jul 2026 21:50', employee: 'Owner', customer: '—', type: 'Sale', total: 550 },
  { no: '3-3976', date: '02 Jul 2026 21:12', employee: 'Owner', customer: '—', type: 'Sale', total: 1850 },
  { no: '3-3975', date: '02 Jul 2026 20:40', employee: 'Owner', customer: '—', type: 'Sale', total: 720 },
];

// ---- Discounts -----------------------------------------------------------
// Discounts applied + amount discounted; the four amounts sum to Rs62,338.
export const discountRows = [
  { name: 'Managers Discount', applied: 11, amount: 34000 },
  { name: 'Family Discount', applied: 14, amount: 10776 },
  { name: 'Staff Food', applied: 10, amount: 17150 },
  { name: 'Residents Discount', applied: 3, amount: 412 },
];

// ---- Sales by modifier ---------------------------------------------------
// Each modifier group carries its own quantity/gross plus its option rows.
export const modifierRows = [
  { name: 'Chapli Burger 1', qty: 1, gross: 0, options: [{ name: 'Beef Chapli', qty: 1, gross: 0 }] },
  { name: 'Chapli Burger 2', qty: 1, gross: 0, options: [{ name: 'Beef Chapli', qty: 1, gross: 0 }] },
  { name: 'Chapli Burger 3', qty: 1, gross: 0, options: [{ name: 'Beef Chapli', qty: 1, gross: 0 }] },
  { name: 'Delivery Charge', qty: 7, gross: 1750, options: [{ name: 'Under 5KM', qty: 7, gross: 1750 }] },
  {
    name: 'Drinks', qty: 14, gross: 0,
    options: [
      { name: '7UP', qty: 2, gross: 0 },
      { name: 'Coke', qty: 6, gross: 0 },
      { name: 'Dew', qty: 2, gross: 0 },
      { name: 'Pepsi', qty: 4, gross: 0 },
    ],
  },
  {
    name: 'Extra Pizza Toppings - Extra Large', qty: 2, gross: 400,
    options: [
      { name: "'+ Chicken Tikka'", qty: 1, gross: 200 },
      { name: "'+ Extra Cheese'", qty: 1, gross: 200 },
    ],
  },
  {
    name: 'Extra Pizza Toppings - Large', qty: 1, gross: 150,
    options: [{ name: "'+ Chicken Tikka'", qty: 1, gross: 150 }],
  },
  {
    name: 'Extra Pizza Toppings - Medium', qty: 1, gross: 100,
    options: [{ name: "'+ Chicken Tikka'", qty: 1, gross: 100 }],
  },
];

// ---- Settings › Features toggles (matches the settings screenshot) -------
export const featureToggles = [
  { key: 'shifts', label: 'Shifts', desc: 'Track cash that goes in and out of your drawer.', on: false },
  { key: 'timeClock', label: 'Time clock', desc: "Track employees' clock in/out time and calculate their total work hours.", on: false },
  { key: 'openTickets', label: 'Open tickets', desc: 'Allow to save and edit orders before completing a payment.', on: false },
  { key: 'kitchenPrinters', label: 'Kitchen printers', desc: 'Send orders to kitchen printer or display.', on: true },
  { key: 'customerDisplays', label: 'Customer displays', desc: 'Display order information to customers at the time of purchase.', on: true },
  { key: 'diningOptions', label: 'Dining options', desc: 'Mark orders as dine in, takeout or for delivery.', on: true },
  { key: 'lowStock', label: 'Low stock notifications', desc: 'Get daily email on items that are low or out of stock.', on: true },
  { key: 'negativeStock', label: 'Negative stock alerts', desc: 'Get alerts when item stock goes below zero.', on: true },
];

// Settings left sub-navigation. `hidden` items are kept here but not shown
// (only "Features" is built for now).
export const settingsSections = [
  { name: 'Features' },
  { name: 'Billing & subscriptions', hidden: true },
  { name: 'Payment types', hidden: true },
  { name: 'Loyalty', hidden: true },
  { name: 'Taxes', hidden: true },
  { name: 'Receipt' },
  { name: 'Kitchen printers' },
  { name: 'Dining options' },
];
