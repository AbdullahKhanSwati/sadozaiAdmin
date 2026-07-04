import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ReportToolbar, Panel, ExportBar, ChartSelect, usePagination, TablePagination } from './munchiesUi.jsx';
import {
  topItems, itemSeries, itemPie, itemRows, ITEM_CHART_TYPES, GRANULARITY_OPTIONS, rs, rsAxis,
} from '../../data/munchiesData.js';

export default function SalesByItem() {
  const [chartType, setChartType] = useState('Bar');
  const [granularity, setGranularity] = useState('Weeks');
  const data = itemSeries(granularity);
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(itemRows, 10);

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar />

      <Panel className="mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          {/* Top 5 items */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold text-ink-700">Top 5 items</div>
              <div className="text-xs text-ink-400">Net sales</div>
            </div>
            <ul className="space-y-4">
              {topItems.map((it) => (
                <li key={it.code} className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: it.color }} />
                  <span className="flex-1 text-sm text-ink-700 leading-tight">{it.code} {it.name}</span>
                  <span className="text-sm font-semibold text-ink-800">{rs(it.net)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Chart + controls */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-4 gap-4">
              <div className="text-lg font-semibold text-ink-700">Sales by item chart</div>
              <div className="flex items-center gap-6">
                <ChartSelect value={chartType} options={ITEM_CHART_TYPES} onChange={setChartType} width="w-36" />
                {chartType !== 'Pie' && (
                  <ChartSelect value={granularity} options={GRANULARITY_OPTIONS} onChange={setGranularity} width="w-40" />
                )}
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {renderItemChart(chartType, data)}
              </ResponsiveContainer>
            </div>
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
                <th className="text-left font-medium px-5 py-3">Item</th>
                <th className="text-left font-medium px-5 py-3">Category</th>
                <th className="text-right font-medium px-5 py-3">Items sold</th>
                <th className="text-right font-medium px-5 py-3">Net sales</th>
                <th className="text-right font-medium px-5 py-3">Cost of goods</th>
                <th className="text-right font-medium px-5 py-3">Gross profit</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.code} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-ink-700">{r.code} {r.name}</td>
                  <td className="px-5 py-3.5 text-ink-500">{r.category}</td>
                  <td className="px-5 py-3.5 text-right text-ink-700">{r.sold}</td>
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

// Returns a Line / stacked-Bar / Pie chart element for the top-5 items.
// Must return the chart element directly for ResponsiveContainer sizing.
function renderItemChart(type, data) {
  if (type === 'Pie') {
    return (
      <PieChart>
        <Tooltip formatter={(v) => rs(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Pie data={itemPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} innerRadius={0} label={false}>
          {itemPie.map((s) => <Cell key={s.name} fill={s.color} />)}
        </Pie>
      </PieChart>
    );
  }

  const common = { data, margin: { top: 10, right: 20, left: 10, bottom: 0 } };
  const axes = (
    <>
      <CartesianGrid strokeDasharray="0" stroke="#EEF2F6" vertical={false} />
      <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
      <YAxis tickFormatter={rsAxis} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} width={80} />
      <Tooltip formatter={(v) => rs(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
    </>
  );

  if (type === 'Bar') {
    return (
      <BarChart {...common}>
        {axes}
        {topItems.map((it) => (
          <Bar key={it.code} dataKey={it.name} stackId="a" fill={it.color} maxBarSize={60} />
        ))}
      </BarChart>
    );
  }

  return (
    <LineChart {...common}>
      {axes}
      {topItems.map((it) => (
        <Line key={it.code} type="monotone" dataKey={it.name} stroke={it.color} strokeWidth={2} dot={false} />
      ))}
    </LineChart>
  );
}
