import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Card, TextBtn } from './catalogUi.jsx';
import { usePagination, TablePagination } from './bfUi.jsx';
import { useBlockFactory } from '../../store/BlockFactoryStore.jsx';
import { rs } from '../../data/munchiesData.js';
import { downloadCsv, csvDate } from '../../lib/csv.js';

const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/**
 * Who owes what. One row per customer with an open balance, plus the totals
 * across the whole book. "Last payment" is the most recent walk-in payment.
 */
export default function Receivables() {
  const navigate = useNavigate();
  const {
    customers, customerBalance, customerPayments, totalOutstanding, reports,
  } = useBlockFactory();
  const [q, setQ] = useState('');
  const [onlyDebtors, setOnlyDebtors] = useState(true);

  const lastPaymentByCustomer = useMemo(() => {
    const m = {};
    // customerPayments arrives newest-first, so the first hit wins.
    customerPayments.forEach((p) => {
      if (!m[p.customer_id]) m[p.customer_id] = p;
    });
    return m;
  }, [customerPayments]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return customers
      .map((c) => {
        const b = customerBalance(c.id);
        const last = lastPaymentByCustomer[c.id];
        return {
          id: c.id,
          name: c.name || 'Unknown',
          phone: c.phone || c.email || '—',
          billed: b.billed,
          paid: b.paid,
          balance: Math.max(0, b.balance),
          sales: reports.customerStats?.[c.id]?.visits || 0,
          lastPaymentOn: last?.paid_on || null,
          lastPaymentAmount: last ? Number(last.amount) || 0 : 0,
        };
      })
      .filter((r) => (onlyDebtors ? r.balance > 0 : true))
      .filter((r) => (needle ? `${r.name} ${r.phone}`.toLowerCase().includes(needle) : true))
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
  }, [customers, customerBalance, lastPaymentByCustomer, reports.customerStats, q, onlyDebtors]);

  const totals = useMemo(
    () => rows.reduce((t, r) => ({ billed: t.billed + r.billed, paid: t.paid + r.paid, balance: t.balance + r.balance }),
      { billed: 0, paid: 0, balance: 0 }),
    [rows]
  );

  const collectedTotal = useMemo(
    () => customerPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [customerPayments]
  );

  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(rows, 25);

  const onExport = () => downloadCsv(`block-factory-receivables-${csvDate()}.csv`, [
    { label: 'Customer', value: 'name' },
    { label: 'Contact', value: 'phone' },
    { label: 'Sales', value: 'sales' },
    { label: 'Billed', value: 'billed' },
    { label: 'Paid', value: 'paid' },
    { label: 'Outstanding', value: 'balance' },
    { label: 'Last payment', value: (r) => fmtDate(r.lastPaymentOn) },
    { label: 'Last payment amount', value: 'lastPaymentAmount' },
  ], rows);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Outstanding (all customers)" value={rs(totalOutstanding)} tone={totalOutstanding > 0 ? 'due' : 'ok'} />
        <Stat label="Customers owing" value={String(customers.filter((c) => customerBalance(c.id).balance > 0).length)} />
        <Stat label="Payments collected on account" value={rs(collectedTotal)} tone="ok" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4 p-5">
          <TextBtn onClick={onExport}>Export</TextBtn>
          <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer select-none">
            <input type="checkbox" checked={onlyDebtors} onChange={(e) => setOnlyDebtors(e.target.checked)} className="accent-bf-600 w-4 h-4" />
            Only customers with a balance
          </label>
          <div className="flex-1" />
          <div className="relative flex items-center gap-2 min-w-[260px] border-b border-bf-500 pb-1">
            <Search className="w-5 h-5 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone" className="flex-1 bg-transparent text-sm text-ink-800 placeholder:text-slate-400 focus:outline-none" />
            {q && <button onClick={() => setQ('')} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>}
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Customer</th>
                <th className="text-left font-medium px-5 py-3">Contact</th>
                <th className="text-right font-medium px-5 py-3">Sales</th>
                <th className="text-right font-medium px-5 py-3">Billed</th>
                <th className="text-right font-medium px-5 py-3">Paid</th>
                <th className="text-right font-medium px-5 py-3">Outstanding</th>
                <th className="text-left font-medium px-5 py-3">Last payment</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/block-factory/customers/${r.id}/statement`)}
                  className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer"
                >
                  <td className="px-5 py-4 font-bold text-ink-800">{r.name}</td>
                  <td className="px-5 py-4 text-ink-600">{r.phone}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{r.sales}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(r.billed)}</td>
                  <td className="px-5 py-4 text-right text-ink-600">{rs(r.paid)}</td>
                  <td className={['px-5 py-4 text-right font-bold', r.balance > 0 ? 'text-rose-600' : 'text-ink-400'].join(' ')}>{rs(r.balance)}</td>
                  <td className="px-5 py-4 text-ink-600">
                    {r.lastPaymentOn ? `${fmtDate(r.lastPaymentOn)} · ${rs(r.lastPaymentAmount)}` : '—'}
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-ink-400">
                    {onlyDebtors ? 'Nobody owes anything right now.' : 'No customers found.'}
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-bold text-ink-800">
                  <td className="px-5 py-4" colSpan={3}>Total ({rows.length})</td>
                  <td className="px-5 py-4 text-right">{rs(totals.billed)}</td>
                  <td className="px-5 py-4 text-right">{rs(totals.paid)}</td>
                  <td className="px-5 py-4 text-right text-rose-600">{rs(totals.balance)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {rows.length > 0 && (
          <TablePagination page={page} pageCount={pageCount} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} />
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const valueTone = tone === 'due' ? 'text-rose-600' : tone === 'ok' ? 'text-bf-700' : 'text-ink-800';
  return (
    <Card className="px-5 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      <div className={`text-2xl font-extrabold mt-1 ${valueTone}`}>{value}</div>
    </Card>
  );
}
