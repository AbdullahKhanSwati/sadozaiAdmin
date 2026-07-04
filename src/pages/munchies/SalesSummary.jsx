import { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ReportToolbar, Panel, ExportBar, ChartSelect, usePagination, TablePagination } from './munchiesUi.jsx';
import {
  salesSummary, SUMMARY_METRICS, SUMMARY_CHART_TYPES, GRANULARITY_OPTIONS,
  summarySeries, dailySalesRows, rs, rsAxis,
} from '../../data/munchiesData.js';

const GREEN = '#7CB342';

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
  const [metric, setMetric] = useState('grossSales');
  const [chartType, setChartType] = useState('Area');
  const [granularity, setGranularity] = useState('Days');

  const active = SUMMARY_METRICS.find((m) => m.key === metric);
  const data = summarySeries(active.field, granularity);
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(dailySalesRows, 10);

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar />

      <Panel className="mb-4">
        {/* Metric tabs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-slate-100">
          {SUMMARY_METRICS.map((m) => {
            const d = salesSummary[m.key];
            const on = metric === m.key;
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
                <div className="mt-1 text-2xl font-bold text-ink-800">{rs(d.value)}</div>
                <div className="mt-1 text-xs font-semibold"><SummaryDelta m={d} /></div>
              </button>
            );
          })}
        </div>

        {/* Chart + controls */}
        <div className="px-5 pb-6 pt-4">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div className="text-lg font-semibold text-ink-700">{active.label}</div>
            <div className="flex items-center gap-6">
              <ChartSelect value={chartType} options={SUMMARY_CHART_TYPES} onChange={setChartType} width="w-36" />
              <ChartSelect value={granularity} options={GRANULARITY_OPTIONS} onChange={setGranularity} width="w-40" />
            </div>
          </div>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {renderSummaryChart(chartType, data)}
            </ResponsiveContainer>
          </div>
        </div>
      </Panel>

      {/* Export table */}
      <Panel>
        <ExportBar />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-right font-medium px-5 py-3">Gross sales</th>
                <th className="text-right font-medium px-5 py-3">Refunds</th>
                <th className="text-right font-medium px-5 py-3">Discounts</th>
                <th className="text-right font-medium px-5 py-3">Net sales</th>
                <th className="text-right font-medium px-5 py-3">Cost of goods</th>
                <th className="text-right font-medium px-5 py-3">Gross profit</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.date} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-ink-700">{r.label} 2026</td>
                  <td className="px-5 py-3.5 text-right text-ink-700">{rs(r.gross)}</td>
                  <td className="px-5 py-3.5 text-right text-ink-500">{rs(r.refunds)}</td>
                  <td className="px-5 py-3.5 text-right text-ink-700">{rs(r.discount)}</td>
                  <td className="px-5 py-3.5 text-right text-ink-700">{rs(r.net)}</td>
                  <td className="px-5 py-3.5 text-right text-ink-500">{rs(r.cost)}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-ink-800">{rs(r.grossProfit)}</td>
                </tr>
              ))}
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

// Returns the summary series as an Area / Line / Bar chart element.
// NOTE: must return the chart element directly so ResponsiveContainer can
// inject width/height into it.
function renderSummaryChart(type, data) {
  const common = { data, margin: { top: 10, right: 20, left: 10, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="0" stroke="#EEF2F6" vertical={false} />
      <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} interval={0} angle={-40} textAnchor="end" height={60} />
      <YAxis tickFormatter={rsAxis} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={80} />
      <Tooltip formatter={(v) => rs(v)} labelStyle={{ fontWeight: 700 }} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
    </>
  );

  if (type === 'Bar') {
    return <BarChart {...common}>{axes}<Bar dataKey="value" fill={GREEN} radius={[3, 3, 0, 0]} maxBarSize={44} /></BarChart>;
  }
  if (type === 'Line') {
    return <LineChart {...common}>{axes}<Line type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2} dot={{ r: 2.5, fill: GREEN }} activeDot={{ r: 4 }} /></LineChart>;
  }
  return (
    <AreaChart {...common}>
      <defs>
        <linearGradient id="munGross" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
          <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {axes}
      <Area type="monotone" dataKey="value" stroke={GREEN} strokeWidth={2} fill="url(#munGross)" dot={{ r: 2.5, fill: GREEN }} activeDot={{ r: 4 }} />
    </AreaChart>
  );
}
