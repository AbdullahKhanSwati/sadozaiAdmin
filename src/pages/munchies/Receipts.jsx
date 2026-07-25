import { useState } from 'react';
import { Receipt, ReceiptText, Search, X } from 'lucide-react';
import { ReportToolbar, Panel, usePagination, TablePagination } from './munchiesUi.jsx';
import { rs } from '../../data/munchiesData.js';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { downloadCsv, csvDate } from '../../lib/csv.js';

const TABS = [
  { key: 'all', label: 'All receipts', icon: Receipt, tone: 'bg-slate-500' },
  { key: 'sales', label: 'Sales', icon: ReceiptText, tone: 'bg-mun-500' },
];

// Named discount summary rows for a receipt detail (per-line + whole-ticket).
function discountRowsFor(d) {
  if (!d) return [];
  const byName = new Map();
  (d.lines || []).forEach((l) => {
    const amt = Math.max(0, (l.baseTotal != null ? l.baseTotal : l.lineTotal) - l.lineTotal);
    if (amt > 0) {
      const name = l.discountName || 'Discount';
      byName.set(name, (byName.get(name) || 0) + amt);
    }
  });
  const rows = Array.from(byName, ([name, amount]) => ({ name, amount }));
  if (d.discount > 0) rows.push({ name: d.discountName || 'Discount', amount: d.discount });
  return rows;
}

export default function Receipts() {
  const { reports } = useMunchies();
  const { receiptStats, receiptRows, receiptById } = reports;
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);

  const byTab = tab === 'sales' ? receiptRows.filter((r) => r.type === 'Sale') : receiptRows;
  const rows = byTab.filter(
    (r) => r.no.toLowerCase().includes(q.toLowerCase()) || r.date.toLowerCase().includes(q.toLowerCase())
  );
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(rows, 10);

  const onExport = () => downloadCsv(`munchies-receipts-${csvDate()}.csv`, [
    { label: 'Receipt no.', value: 'no' },
    { label: 'Date', value: 'date' },
    { label: 'Employee', value: 'employee' },
    { label: 'Customer', value: (r) => (r.customer === '—' ? '' : r.customer) },
    { label: 'Type', value: 'type' },
    { label: 'Total', value: (r) => r.total || 0 },
  ], rows);

  const detail = openId ? receiptById?.[openId] : null;

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
          <button onClick={onExport} className="text-sm font-bold tracking-wide text-ink-600 hover:text-mun-600">
            EXPORT
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
                <tr key={r.id || r.no} onClick={() => setOpenId(r.id)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
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

      {/* Receipt detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setOpenId(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <div>
                <div className="text-lg font-bold text-ink-800">{detail.no}</div>
                <div className="text-xs text-ink-400">{detail.date}</div>
              </div>
              <button onClick={() => setOpenId(null)} className="text-ink-400 hover:text-ink-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-ink-800">{rs(detail.total)}</div>
                <div className="text-sm text-ink-400">Total</div>
              </div>
              <div className="text-sm text-ink-600 space-y-1 mb-4">
                {detail.customer && <div>Customer: <span className="text-ink-800 font-medium">{detail.customer}</span></div>}
                <div>Employee: <span className="text-ink-800 font-medium">{detail.employee}</span></div>
                {detail.dining && <div>Dining: <span className="text-ink-800 font-medium">{detail.dining}</span></div>}
                <div>Type: <span className="text-ink-800 font-medium">{detail.type}</span></div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                {detail.lines.length === 0 && <div className="text-sm text-ink-400 py-2">No line items recorded.</div>}
                {detail.lines.map((l, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-slate-50 last:border-b-0">
                    <div className="min-w-0 pr-3">
                      <div className="text-ink-800">{`${l.code} ${l.name}`.trim()}</div>
                      <div className="text-xs text-ink-400">{l.qty} × {rs(l.unit)}</div>
                      {(l.mods || []).map((m, mi) => (
                        <div key={mi} className="text-xs text-ink-400">+ {m.name} ({rs(m.price)})</div>
                      ))}
                    </div>
                    <div className="text-ink-800 whitespace-nowrap">{rs(l.baseTotal != null ? l.baseTotal : l.lineTotal)}</div>
                  </div>
                ))}
                {discountRowsFor(detail).map((d, i) => (
                  <div key={i} className="flex justify-between py-2 text-mun-600">
                    <span>{d.name}</span>
                    <span>- {rs(d.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-3 mt-1 border-t border-slate-200 font-bold text-ink-800">
                  <span>Total</span>
                  <span>{rs(detail.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
