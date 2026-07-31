import { useState } from 'react';
import { Ban, ChevronDown, Receipt, ReceiptText, RotateCcw, Search, X } from 'lucide-react';
import { ReportToolbar, Panel, usePagination, TablePagination } from './munchiesUi.jsx';
import { rs } from '../../data/munchiesData.js';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { downloadCsv, csvDate } from '../../lib/csv.js';

const TABS = [
  { key: 'all', label: 'All receipts', icon: Receipt, tone: 'bg-slate-500' },
  { key: 'sales', label: 'Sales', icon: ReceiptText, tone: 'bg-mun-500' },
  { key: 'cancelled', label: 'Cancelled', icon: Ban, tone: 'bg-rose-500' },
];

const exportDate = (iso) => {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
};

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
  const { reports, cancelReceipt, restoreReceipt } = useMunchies();
  const { receiptStats, receiptRows, receiptLineRows, receiptById } = reports;
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [cancelFor, setCancelFor] = useState(null); // receipt pending cancellation
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  const byTab = tab === 'sales'
    ? receiptRows.filter((r) => r.type === 'Sale' && !r.cancelled)
    : tab === 'cancelled'
      ? receiptRows.filter((r) => r.cancelled)
      : receiptRows;
  const needle = q.toLowerCase();
  const rows = byTab.filter(
    (r) => r.no.toLowerCase().includes(needle) || r.date.toLowerCase().includes(needle)
  );
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(rows, 10);

  // ---- Exports -------------------------------------------------------------
  // Receipt level: one row per receipt (the running total).
  const exportReceipts = () => downloadCsv(`munchies-receipts-${csvDate()}.csv`, [
    { label: 'Receipt no.', value: 'no' },
    { label: 'Date', value: (r) => exportDate(r.isoDate) },
    { label: 'Time', value: 'time' },
    { label: 'Employee', value: 'employee' },
    { label: 'Customer', value: (r) => (r.customer === '—' ? '' : r.customer) },
    { label: 'Dining option', value: 'dining' },
    { label: 'Type', value: 'type' },
    { label: 'Status', value: 'status' },
    { label: 'Cancel reason', value: 'cancelReason' },
    { label: 'Total', value: (r) => r.total || 0 },
  ], rows);

  // Line level (Loyverse "receipt items"): one row per item sold, repeating the
  // receipt header on each line so it can be pivoted in Excel.
  const exportLines = () => {
    const keep = new Set(rows.map((r) => r.id));
    const lines = receiptLineRows.filter((l) => keep.has(l.receiptId));
    downloadCsv(`munchies-receipt-lines-${csvDate()}.csv`, [
      { label: 'Receipt no.', value: 'no' },
      { label: 'Date', value: (l) => exportDate(l.isoDate) },
      { label: 'Time', value: 'time' },
      { label: 'Employee', value: 'employee' },
      { label: 'Customer', value: 'customer' },
      { label: 'Dining option', value: 'dining' },
      { label: 'Type', value: 'type' },
      { label: 'Status', value: 'status' },
      { label: 'Item code', value: 'code' },
      { label: 'Item', value: 'name' },
      { label: 'Category', value: 'category' },
      { label: 'Modifiers', value: 'modifiers' },
      { label: 'Qty', value: (l) => l.qty || 0 },
      { label: 'Unit price', value: (l) => l.unit || 0 },
      { label: 'Gross total', value: (l) => l.grossTotal || 0 },
      { label: 'Discount', value: (l) => l.discount || 0 },
      { label: 'Discount name', value: 'discountName' },
      { label: 'Net total', value: (l) => l.netTotal || 0 },
      { label: 'Receipt total', value: (l) => l.receiptTotal || 0 },
    ], lines);
  };

  const pickExport = (fn) => { setExportOpen(false); fn(); };

  // ---- Cancellation --------------------------------------------------------
  const askCancel = (r) => { setCancelFor(r); setCancelReason(''); };

  const confirmCancel = async () => {
    setBusy(true);
    try {
      await cancelReceipt(cancelFor.id, cancelReason.trim());
      setCancelFor(null);
      setOpenId(null);
    } catch (e) {
      window.alert(e?.message || 'Could not cancel this order.');
    } finally {
      setBusy(false);
    }
  };

  const onRestore = async (r) => {
    if (!window.confirm(`Restore order ${r.no}? It will count towards sales again.`)) return;
    setBusy(true);
    try { await restoreReceipt(r.id); }
    catch (e) { window.alert(e?.message || 'Could not restore this order.'); }
    finally { setBusy(false); }
  };

  const detail = openId ? receiptById?.[openId] : null;
  const detailRow = openId ? receiptRows.find((r) => r.id === openId) : null;

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar />

      {/* Tabs */}
      <Panel className="mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-slate-100">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setPage(1); }}
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
                  <div className="text-3xl font-bold text-ink-800">{receiptStats[t.key] ?? 0}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Table */}
      <Panel>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 gap-3">
          {/* Export: pick receipt-level or line-by-line */}
          <div className="relative">
            {exportOpen && <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />}
            <button
              onClick={() => setExportOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm font-bold tracking-wide text-ink-600 hover:text-mun-600"
            >
              EXPORT <ChevronDown className="w-4 h-4" />
            </button>
            {exportOpen && (
              <div className="absolute left-0 z-20 mt-2 w-72 bg-white rounded-md border border-slate-200 shadow-pop py-1 animate-fade-in">
                <button
                  onClick={() => pickExport(exportReceipts)}
                  className="block w-full text-left px-4 py-3 hover:bg-slate-50"
                >
                  <div className="text-sm font-semibold text-ink-800">Summary — one row per receipt</div>
                  <div className="text-xs text-ink-400 mt-0.5">Receipt no., date, customer, total</div>
                </button>
                <button
                  onClick={() => pickExport(exportLines)}
                  className="block w-full text-left px-4 py-3 hover:bg-slate-50 border-t border-slate-100"
                >
                  <div className="text-sm font-semibold text-ink-800">Line by line — one row per item</div>
                  <div className="text-xs text-ink-400 mt-0.5">Every item sold, with qty, price and modifiers</div>
                </button>
              </div>
            )}
          </div>
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
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.id || r.no} onClick={() => setOpenId(r.id)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                  <td className="px-5 py-4 text-ink-700">
                    {r.no}
                    {r.cancelled && (
                      <span className="ml-2 align-middle text-[10px] uppercase tracking-wide font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5">
                        Cancelled
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-ink-600">{r.date}</td>
                  <td className="px-5 py-4 text-ink-700">{r.employee}</td>
                  <td className="px-5 py-4 text-ink-400">{r.customer}</td>
                  <td className="px-5 py-4 text-ink-700">{r.type}</td>
                  <td className={['px-5 py-4 text-right font-semibold', r.cancelled ? 'text-ink-400 line-through' : 'text-ink-800'].join(' ')}>
                    {rs(r.total)}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {r.cancelled ? (
                      <button
                        onClick={() => onRestore(r)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-mun-600 disabled:opacity-40"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => askCancel(r)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-rose-600 disabled:opacity-40"
                      >
                        <Ban className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-ink-400">No receipts found.</td></tr>
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
              {detail.cancelled && (
                <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <span className="font-bold">Cancelled</span>
                  {detail.cancelledAt ? ` · ${detail.cancelledAt}` : ''}
                  {detail.cancelReason ? <div className="text-xs mt-0.5">Reason: {detail.cancelReason}</div> : null}
                </div>
              )}
              <div className="text-center mb-4">
                <div className={['text-3xl font-bold', detail.cancelled ? 'text-ink-400 line-through' : 'text-ink-800'].join(' ')}>
                  {rs(detail.total)}
                </div>
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
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              {detail.cancelled ? (
                <button
                  onClick={() => onRestore(detailRow)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" /> Restore order
                </button>
              ) : (
                <button
                  onClick={() => askCancel(detailRow)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" /> Cancel order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {cancelFor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setCancelFor(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-100">
              <div className="text-lg font-bold text-ink-800">Cancel order {cancelFor.no}?</div>
              <p className="text-sm text-ink-500 mt-1">
                The receipt stays in the list for your records but stops counting towards sales, items and profit.
                You can restore it later.
              </p>
            </div>
            <div className="p-5">
              <label className="block text-xs text-ink-400 mb-1">Reason (optional)</label>
              <input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Wrong order, customer left"
                autoFocus
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
              <button onClick={() => setCancelFor(null)} className="px-4 py-2 text-sm font-semibold text-ink-500 hover:text-ink-700">Keep order</button>
              <button
                onClick={confirmCancel}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? 'Cancelling…' : 'Cancel order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
