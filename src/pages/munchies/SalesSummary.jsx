import { useMemo, useState } from 'react';
import {
  ComposedChart, Area, Line, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  ReportToolbar, Panel, ExportBar, ChartSelect, usePagination, TablePagination,
  defaultRange, inRange, rangeLabel,
} from './munchiesUi.jsx';
import {
  SUMMARY_METRICS, SUMMARY_CHART_TYPES, GRANULARITY_OPTIONS, rs, rsAxis,
} from '../../data/munchiesData.js';
import * as XLSX from 'xlsx-js-style';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { downloadCsv, csvDate } from '../../lib/csv.js';

const GREEN = '#7CB342';
const ROSE = '#E5484D';

const exportDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
};

// Absolute delta + percentage line under each card, coloured by favourability.
function SummaryDelta({ m }) {
  const bad = m.betterWhenUp ? m.trend < 0 : m.trend > 0;
  const color = m.trend === 0 ? 'text-ink-400' : bad ? 'text-rose-500' : 'text-mun-600';
  const dSign = m.delta > 0 ? '+' : m.delta < 0 ? '-' : '';
  const deltaStr = `${dSign}${rs(Math.abs(m.delta))}`;
  const trendStr = m.trend === 0 ? '(0%)' : `(${m.trend > 0 ? '+' : ''}${m.trend.toFixed(2)}%)`;
  return <span className={color}>{deltaStr} {trendStr}</span>;
}

export default function SalesSummary() {
  const { reports } = useMunchies();
  const [metric, setMetric] = useState('grossSales');
  const [chartType, setChartType] = useState('Area');
  const [granularity, setGranularity] = useState('Days');
  const [showExpenses, setShowExpenses] = useState(true);

  // Every figure on this page is scoped to the selected period, which starts at
  // month-to-date rather than "everything ever".
  const [range, setRange] = useState(defaultRange);

  const active = SUMMARY_METRICS.find((m) => m.key === metric);

  // Days inside the period, oldest first (chart order).
  const periodDays = useMemo(
    () => (reports.daily || []).filter((d) => inRange(d.date, range)),
    [reports.daily, range]
  );
  const periodRows = useMemo(() => [...periodDays].reverse(), [periodDays]);
  const periodExpenseRows = useMemo(
    () => (reports.expenseDailyRows || []).filter((r) => inRange(r.date, range)),
    [reports.expenseDailyRows, range]
  );

  // Period totals — the stat cards. Derived from the same day rows the table
  // shows, so the cards and the table can never disagree.
  const totals = useMemo(() => {
    const sum = (f) => periodDays.reduce((s, d) => s + (d[f] || 0), 0);
    const gross = sum('gross');
    const discount = sum('discount');
    const refunds = sum('refunds');
    const expenses = sum('expenses');
    const net = gross - discount - refunds;
    return {
      grossSales: gross, discounts: discount, refunds,
      netSales: net, expenses, netProfit: net - expenses, grossProfit: net,
    };
  }, [periodDays]);

  // Chart series over the period. Weeks bucket by real ISO week inside the
  // range — the old fixed week list was hard-coded to a sample month, so the
  // chart came up empty whenever "Weeks" was picked.
  const data = useMemo(() => {
    if (granularity === 'Weeks') {
      const buckets = new Map();
      periodDays.forEach((d) => {
        const dt = new Date(`${d.date}T00:00:00`);
        const dow = (dt.getDay() + 6) % 7;               // Monday-based
        const monday = new Date(dt); monday.setDate(dt.getDate() - dow);
        const key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const cur = buckets.get(key) || {
          key,
          bucket: monday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          value: 0,
          expenses: 0,
        };
        cur.value += d[active.field] || 0;
        cur.expenses += d.expenses || 0;
        buckets.set(key, cur);
      });
      return [...buckets.values()].sort((a, b) => a.key.localeCompare(b.key));
    }
    return periodDays.map((d) => ({ bucket: d.label, value: d[active.field] || 0, expenses: d.expenses || 0 }));
  }, [periodDays, granularity, active.field]);

  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(periodRows, 10);

  // The expenses series is already in the data; only draw it when it adds
  // something (i.e. the selected metric isn't Expenses itself).
  const withExpenses = showExpenses && active.field !== 'expenses';

  // Same table as on screen, one row per day, with expenses summarised per day.
  const onExport = () => downloadCsv(`munchies-summary-${csvDate()}.csv`, [
    { label: 'Date', value: (r) => exportDate(r.date) },
    { label: 'Gross sales', value: (r) => r.gross || 0 },
    { label: 'Discounts', value: (r) => r.discount || 0 },
    { label: 'Net sales', value: (r) => r.net || 0 },
    { label: 'Expenses', value: (r) => r.expenses || 0 },
    { label: 'Net profit', value: (r) => r.netProfit || 0 },
  ], periodRows);

  // "Export summary": an Excel workbook of exactly what is on screen right now —
  // the selected period, the metric tab that is open, the chart as configured
  // (type / days-or-weeks / expenses overlay), the stat cards, the day table
  // and the period's expenses by category.
  const onExportSummary = () => exportSummaryXlsx({
    range, active, chartType, granularity, withExpenses, totals, data, periodRows, periodExpenseRows,
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar range={range} onRange={setRange} />

      <Panel className="mb-4">
        {/* Metric tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-100">
          {SUMMARY_METRICS.map((m) => {
            const d = { ...reports.summary[m.key], value: totals[m.key] ?? 0 };
            const on = metric === m.key;
            const negative = m.key === 'netProfit' && d.value < 0;
            return (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={[
                  'p-5 text-left transition border-b-2',
                  on ? 'border-mun-600 bg-slate-50/40' : 'border-transparent hover:bg-slate-50',
                ].join(' ')}
              >
                <div className="text-sm text-ink-500">{m.label}</div>
                <div className={['mt-1 text-2xl font-bold', negative ? 'text-rose-600' : 'text-ink-800'].join(' ')}>
                  {rs(d.value)}
                </div>
                <div className="mt-1 text-xs font-semibold"><SummaryDelta m={d} /></div>
              </button>
            );
          })}
        </div>

        {/* Chart + controls */}
        <div className="px-5 pb-6 pt-4">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div className="text-lg font-semibold text-ink-700">
              {active.label}{withExpenses ? ' vs Expenses' : ''}
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 text-sm font-medium text-ink-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showExpenses}
                  onChange={(e) => setShowExpenses(e.target.checked)}
                  className="w-4 h-4 accent-rose-500"
                />
                Show expenses
              </label>
              <ChartSelect value={chartType} options={SUMMARY_CHART_TYPES} onChange={setChartType} width="w-36" />
              <ChartSelect value={granularity} options={GRANULARITY_OPTIONS} onChange={setGranularity} width="w-40" />
            </div>
          </div>
          <div className="h-[320px] w-full">
            {data.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-ink-400 border border-dashed border-slate-200 rounded">
                <div className="text-sm font-medium">Nothing to chart for “{rangeLabel(range)}”.</div>
                <div className="text-xs mt-1">Pick another period from the date selector above.</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {renderSummaryChart(chartType, data, active.label, withExpenses)}
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </Panel>

      {/* Export table */}
      <Panel>
        <ExportBar onExport={onExport}>
          <span className="hidden sm:inline text-xs font-semibold text-ink-400 whitespace-nowrap">
            {rangeLabel(range)}
          </span>
          <button
            onClick={onExportSummary}
            disabled={!periodRows.length && !periodExpenseRows.length}
            className="text-sm font-bold tracking-wide text-ink-600 hover:text-mun-600 disabled:opacity-40 disabled:hover:text-ink-600"
            title="Download everything shown on this page (selected period, metric, chart and table) as an Excel file"
          >
            EXPORT SUMMARY
          </button>
        </ExportBar>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-right font-medium px-5 py-3">Gross sales</th>
                <th className="text-right font-medium px-5 py-3">Discounts</th>
                <th className="text-right font-medium px-5 py-3">Net sales</th>
                <th className="text-right font-medium px-5 py-3">Expenses</th>
                <th className="text-right font-medium px-5 py-3">Net profit</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.date} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-ink-700">{r.label} {r.date.slice(0, 4)}</td>
                  <td className="px-5 py-3.5 text-right text-ink-700">{rs(r.gross)}</td>
                  <td className="px-5 py-3.5 text-right text-ink-700">{rs(r.discount)}</td>
                  <td className="px-5 py-3.5 text-right text-ink-700">{rs(r.net)}</td>
                  <td className="px-5 py-3.5 text-right text-rose-600">{r.expenses ? `- ${rs(r.expenses)}` : rs(0)}</td>
                  <td className={['px-5 py-3.5 text-right font-semibold', r.netProfit < 0 ? 'text-rose-600' : 'text-ink-800'].join(' ')}>
                    {rs(r.netProfit)}
                  </td>
                </tr>
              ))}
              {periodRows.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-400">No sales or expenses in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          pageCount={pageCount}
          rowsPerPage={rowsPerPage}
          setPage={setPage}
          setRowsPerPage={setRowsPerPage}
        />
      </Panel>
    </div>
  );
}

// Returns the summary series as an Area / Line / Bar chart element, with the
// daily expense total overlaid as a second (red) series.
// NOTE: must return the chart element directly so ResponsiveContainer can
// inject width/height into it.
function renderSummaryChart(type, data, label, withExpenses) {
  const expenseSeries = withExpenses
    ? <Bar dataKey="expenses" name="Expenses" fill={ROSE} fillOpacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={26} />
    : null;

  let main;
  if (type === 'Bar') {
    main = <Bar dataKey="value" name={label} fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={44} />;
  } else if (type === 'Line') {
    main = <Line type="monotone" dataKey="value" name={label} stroke={GREEN} strokeWidth={2} dot={{ r: 2.5, fill: GREEN }} activeDot={{ r: 4 }} />;
  } else {
    main = <Area type="monotone" dataKey="value" name={label} stroke={GREEN} strokeWidth={2} fill="url(#munGross)" dot={{ r: 2.5, fill: GREEN }} activeDot={{ r: 4 }} />;
  }

  // With a long period, one tick per day turns the axis into a black smear —
  // thin the labels out so ~14 stay readable.
  const tickInterval = data.length > 14 ? Math.ceil(data.length / 14) - 1 : 0;

  return (
    <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
      <defs>
        <linearGradient id="munGross" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
          <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="0" stroke="#EEF2F6" vertical={false} />
      <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} interval={tickInterval} angle={-40} textAnchor="end" height={60} />
      <YAxis tickFormatter={rsAxis} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={80} />
      <Tooltip formatter={(v) => rs(v)} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
      {withExpenses && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />}
      {expenseSeries}
      {main}
    </ComposedChart>
  );
}

// ---- Export summary (.xlsx) ----------------------------------------------
// Sheet "Summary"     : period, what was selected on screen, the stat cards and
//                       the chart series exactly as charted.
// Sheet "Daily"       : the table under the chart (every day of the period).
// Sheet "Expenses"    : the period's expenses grouped by day and category.
function exportSummaryXlsx({ range, active, chartType, granularity, withExpenses, totals, data, periodRows, periodExpenseRows }) {
  const HEADER_FILL = '43A047';
  const bd = { style: 'thin', color: { rgb: 'BFBFBF' } };
  const borders = { top: bd, bottom: bd, left: bd, right: bd };
  const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

  const styleSheet = (ws, aoa, { headerRows = [], boldRows = [], cols = [] } = {}) => {
    const nCols = Math.max(...aoa.map((r) => r.length), 1);
    ws['!cols'] = cols.length ? cols : Array.from({ length: nCols }, () => ({ wch: 18 }));
    for (let R = 0; R < aoa.length; R += 1) {
      for (let C = 0; C < nCols; C += 1) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[ref]) continue;
        const st = { alignment: { vertical: 'center' } };
        if (typeof ws[ref].v === 'number') st.numFmt = '#,##0.00';
        if (headerRows.includes(R)) {
          st.fill = { fgColor: { rgb: HEADER_FILL } };
          st.font = { bold: true, color: { rgb: 'FFFFFF' } };
          st.border = borders;
        } else if (boldRows.includes(R)) {
          st.font = { bold: true };
        }
        ws[ref].s = st;
      }
    }
  };

  const periodText = range?.key === 'all' || (!range?.start && !range?.end)
    ? 'All time'
    : `${exportDate(range.start)} - ${exportDate(range.end)}`;
  const chartTitle = `${active.label}${withExpenses ? ' vs Expenses' : ''}`;

  // --- Sheet 1: Summary ---
  const summaryRows = [
    ['Munchies - Sales summary'],
    ['Period', rangeLabel(range), periodText],
    ['Exported', new Date().toLocaleString('en-GB')],
    [],
    ['Selected metric', active.label],
    ['Chart', `${chartType} / ${granularity}${withExpenses ? ' / expenses shown' : ''}`],
    [],
    ['Metric', 'Amount (Rs)'],
    ...SUMMARY_METRICS.map((m) => [m.label, money(totals[m.key] ?? 0)]),
    [],
    [`Chart data - ${chartTitle} by ${granularity.toLowerCase()}`],
    [granularity === 'Weeks' ? 'Week' : 'Day', active.label, ...(withExpenses ? ['Expenses'] : [])],
    ...data.map((d) => [d.bucket, money(d.value), ...(withExpenses ? [money(d.expenses)] : [])]),
  ];
  const metricsHeader = 7;
  const chartHeader = metricsHeader + SUMMARY_METRICS.length + 3;
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  styleSheet(wsSummary, summaryRows, {
    headerRows: [metricsHeader, chartHeader],
    boldRows: [0, chartHeader - 1],
    cols: [{ wch: 30 }, { wch: 22 }, { wch: 26 }],
  });

  // --- Sheet 2: Daily table (what the table below the chart shows) ---
  const sum = (f) => periodRows.reduce((s, r) => s + (r[f] || 0), 0);
  const dailyRows = [
    ['Date', 'Gross sales', 'Discounts', 'Net sales', 'Expenses', 'Net profit'],
    ...periodRows.map((r) => [exportDate(r.date), money(r.gross), money(r.discount), money(r.net), money(r.expenses), money(r.netProfit)]),
    ['Total', money(sum('gross')), money(sum('discount')), money(sum('net')), money(sum('expenses')), money(sum('netProfit'))],
  ];
  const wsDaily = XLSX.utils.aoa_to_sheet(dailyRows);
  styleSheet(wsDaily, dailyRows, { headerRows: [0], boldRows: [dailyRows.length - 1], cols: [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }] });

  // --- Sheet 3: Expenses by day + category ---
  const expRows = [
    ['Date', 'Category', 'Entries', 'Amount'],
    ...periodExpenseRows.map((r) => [exportDate(r.date), r.category, r.count || 0, money(r.amount)]),
    ['Total', '', periodExpenseRows.reduce((s, r) => s + (r.count || 0), 0), money(periodExpenseRows.reduce((s, r) => s + (r.amount || 0), 0))],
  ];
  const wsExp = XLSX.utils.aoa_to_sheet(expRows);
  styleSheet(wsExp, expRows, { headerRows: [0], boldRows: [expRows.length - 1], cols: [{ wch: 14 }, { wch: 24 }, { wch: 10 }, { wch: 14 }] });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily');
  XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');
  const tag = range?.start && range?.end ? `${range.start}_to_${range.end}` : 'all-time';
  XLSX.writeFile(wb, `munchies-summary-${tag}-${csvDate()}.xlsx`);
}
