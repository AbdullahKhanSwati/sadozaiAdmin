import { useState } from 'react';
import { Receipt, ReceiptText, Search, ChevronDown } from 'lucide-react';
import { ReportToolbar, Panel, usePagination, TablePagination } from './munchiesUi.jsx';
import { rs } from '../../data/munchiesData.js';
import { useMunchies } from '../../store/MunchiesStore.jsx';

const TABS = [
  { key: 'all', label: 'All receipts', icon: Receipt, tone: 'bg-slate-500' },
  { key: 'sales', label: 'Sales', icon: ReceiptText, tone: 'bg-mun-500' },
];

export default function Receipts() {
  const { reports } = useMunchies();
  const { receiptStats, receiptRows } = reports;
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');

  const byTab = tab === 'sales' ? receiptRows.filter((r) => r.type === 'Sale') : receiptRows;
  const rows = byTab.filter(
    (r) => r.no.toLowerCase().includes(q.toLowerCase()) || r.date.toLowerCase().includes(q.toLowerCase())
  );
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(rows, 10);

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar />

      {/* Tabs */}
      <Panel className="mb-4">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'flex items-center gap-4 p-6 text-left transition border-b-2',
                  on ? 'border-mun-600 bg-slate-50/40' : 'border-transparent hover:bg-slate-50',
                ].join(' ')}
              >
                <div className={['w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0', t.tone].join(' ')}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg text-mun-700 font-medium">{t.label}</div>
                  <div className="text-3xl font-bold text-ink-800">{receiptStats[t.key]}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Table */}
      <Panel>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button className="flex items-center gap-1 text-sm font-bold tracking-wide text-ink-600 hover:text-mun-600">
            EXPORT <ChevronDown className="w-4 h-4" />
          </button>
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-mun-500/30 focus:border-mun-400 w-52"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Receipt no.</th>
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Employee</th>
                <th className="text-left font-medium px-5 py-3">Customer</th>
                <th className="text-left font-medium px-5 py-3">Type</th>
                <th className="text-right font-medium px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.no} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                  <td className="px-5 py-4 text-ink-700">{r.no}</td>
                  <td className="px-5 py-4 text-ink-600">{r.date}</td>
                  <td className="px-5 py-4 text-ink-700">{r.employee}</td>
                  <td className="px-5 py-4 text-ink-400">{r.customer}</td>
                  <td className="px-5 py-4 text-ink-700">{r.type}</td>
                  <td className="px-5 py-4 text-right font-semibold text-ink-800">{rs(r.total)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-400">No receipts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && (
          <TablePagination
            page={page}
            pageCount={pageCount}
            rowsPerPage={rowsPerPage}
            setPage={setPage}
            setRowsPerPage={setRowsPerPage}
          />
        )}
      </Panel>
    </div>
  );
}
