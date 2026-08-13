import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Card, PrimaryBtn, TextBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useBlockFactory } from '../../store/BlockFactoryStore.jsx';
import { rs } from '../../data/munchiesData.js';
import { downloadCsv, csvDate } from '../../lib/csv.js';

const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

/**
 * One customer's account: every sale billed to them and every payment received,
 * merged into a single running statement, with a Record payment action.
 *
 * Balance = billed − paid at the till − payments received afterwards, over
 * non-cancelled receipts. Identical to what the mobile app shows.
 */
export default function CustomerStatement() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    customers, reports, customerBalance, paymentsForCustomer, openBillsForCustomer,
    addCustomerPayment, deleteCustomerPayment, ready,
  } = useBlockFactory();

  const customer = customers.find((c) => c.id === id);
  const bal = customerBalance(id);
  const outstanding = Math.max(0, bal.balance);
  const payments = paymentsForCustomer(id);
  const openBills = openBillsForCustomer(id);

  const [open, setOpen] = useState(false);
  const [receiptId, setReceiptId] = useState('');   // which bill is being paid
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paidOn, setPaidOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const selectedBill = openBills.find((b) => b.id === receiptId) || null;
  const billDue = selectedBill ? selectedBill.balance : 0;

  // Sales + payments on one timeline, newest first.
  const rows = useMemo(() => {
    const sales = (reports.receiptRows || [])
      .filter((r) => r.customerId === id)
      .map((r) => ({
        kind: 'sale',
        key: `s-${r.id}`,
        isoDate: r.isoDate,
        label: `Bill ${r.billRef || r.no}`,
        // `r.paid` already includes payments applied to this bill, so the
        // statement never double-counts them: show only the till amount here.
        sub: r.cancelled ? `Cancelled${r.cancelReason ? ` — ${r.cancelReason}` : ''}` : `Sale ${r.no}`,
        billed: r.cancelled ? 0 : r.total,
        received: 0,
        cancelled: r.cancelled,
        receiptId: r.id,
      }));
    // At-the-till collections, shown against their own bill.
    const tillRows = (reports.receiptRows || [])
      .filter((r) => r.customerId === id && !r.cancelled)
      .map((r) => {
        const applied = payments
          .filter((p) => p.receipt_id === r.id)
          .reduce((s, p) => s + (Number(p.amount) || 0), 0);
        return { r, atTill: Math.max(0, (r.paid || 0) - applied) };
      })
      .filter((x) => x.atTill > 0)
      .map(({ r, atTill }) => ({
        kind: 'till',
        key: `t-${r.id}`,
        isoDate: r.isoDate,
        label: 'Paid at sale',
        sub: `Bill ${r.billRef || r.no}`,
        billed: 0,
        received: atTill,
      }));
    const billByReceipt = Object.fromEntries((reports.receiptRows || []).map((r) => [r.id, r]));
    const pays = payments.map((p) => {
      const bill = p.receipt_id ? billByReceipt[p.receipt_id] : null;
      return {
        kind: 'payment',
        key: `p-${p.id}`,
        id: p.id,
        isoDate: p.paid_on,
        label: 'Payment received',
        sub: [bill ? `Bill ${bill.billRef || bill.no}` : 'On account', p.note].filter(Boolean).join(' · '),
        billed: 0,
        received: Number(p.amount) || 0,
      };
    });
    return [...sales, ...tillRows, ...pays].sort((a, b) => String(b.isoDate).localeCompare(String(a.isoDate)));
  }, [reports.receiptRows, payments, id]);

  const onExport = () =>
    downloadCsv(`block-factory-statement-${(customer?.name || 'customer').replace(/\s+/g, '-').toLowerCase()}-${csvDate()}.csv`, [
      { label: 'Date', value: (r) => fmtDate(r.isoDate) },
      { label: 'Entry', value: 'label' },
      { label: 'Detail', value: 'sub' },
      { label: 'Billed', value: 'billed' },
      { label: 'Received', value: 'received' },
    ], rows);

  const openDialog = () => {
    const first = openBills[0];
    setReceiptId(first?.id || '');
    setAmount(first ? String(first.balance) : '');
    setNote('');
    setPaidOn(new Date().toISOString().slice(0, 10));
    setOpen(true);
  };

  // Switching bills re-fills the amount with that bill's balance.
  const pickBill = (rid) => {
    setReceiptId(rid);
    const b = openBills.find((x) => x.id === rid);
    setAmount(b ? String(b.balance) : '');
  };

  const submit = async () => {
    setSaving(true);
    try {
      await addCustomerPayment({ customerId: id, receiptId, amount, note, paidOn });
      setOpen(false);
      setAmount(''); setNote(''); setReceiptId('');
    } catch (e) {
      window.alert(e?.message || 'Could not record the payment.');
    } finally {
      setSaving(false);
    }
  };

  const removePayment = async (paymentId) => {
    if (!window.confirm('Delete this payment? The customer’s balance will go back up.')) return;
    try {
      await deleteCustomerPayment(paymentId);
    } catch (e) {
      window.alert(e?.message || 'Could not delete the payment.');
    }
  };

  if (!customer) {
    return (
      <div className="max-w-[1100px] mx-auto">
        <Card className="p-10 text-center text-ink-400">
          {ready ? 'Customer not found.' : 'Loading…'}
        </Card>
      </div>
    );
  }

  const entered = Math.min(Math.max(0, Math.round(Number(amount) || 0)), billDue);

  return (
    <div className="max-w-[1100px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/block-factory/customers')} className="p-2 -ml-2 rounded hover:bg-slate-200/70 text-ink-600" aria-label="Back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <div className="text-xl font-extrabold text-ink-800 truncate">{customer.name || 'Unknown'}</div>
          <div className="text-sm text-ink-500 truncate">{customer.phone || customer.email || 'No contact details'}</div>
        </div>
        <div className="flex-1" />
        <TextBtn onClick={() => navigate(`/block-factory/customers/${id}`)}>Edit profile</TextBtn>
        <TextBtn onClick={onExport}>Export</TextBtn>
        <PrimaryBtn
          onClick={openDialog}
          className={openBills.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
          disabled={openBills.length === 0}
        >
          Record payment
        </PrimaryBtn>
      </div>

      {/* Account totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total billed" value={rs(bal.billed)} />
        <Stat label="Amount paid" value={rs(bal.paid)} />
        <Stat label="Amount remaining" value={rs(outstanding)} tone={outstanding > 0 ? 'due' : 'ok'} />
      </div>

      {/* Statement */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100 text-sm font-bold text-ink-700">Statement</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Entry</th>
                <th className="text-right font-medium px-5 py-3">Billed</th>
                <th className="text-right font-medium px-5 py-3">Received</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 text-ink-600 whitespace-nowrap">{fmtDate(r.isoDate)}</td>
                  <td className="px-5 py-3.5">
                    <button
                      className={['font-semibold text-left', r.kind === 'sale' ? 'text-ink-800 hover:text-bf-700' : 'text-bf-700', r.cancelled && 'line-through text-ink-400'].filter(Boolean).join(' ')}
                      onClick={() => r.kind === 'sale' && navigate('/block-factory/reports/receipts')}
                    >
                      {r.label}
                    </button>
                    {r.sub ? <div className="text-xs text-ink-400 mt-0.5">{r.sub}</div> : null}
                  </td>
                  <td className="px-5 py-3.5 text-right text-ink-700">{r.billed ? rs(r.billed) : '—'}</td>
                  <td className="px-5 py-3.5 text-right text-bf-700 font-semibold">{r.received ? rs(r.received) : '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    {r.kind === 'payment' && (
                      <button onClick={() => removePayment(r.id)} className="text-ink-300 hover:text-rose-600" title="Delete payment">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">No sales or payments yet.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-bold text-ink-800">
                  <td className="px-5 py-4" colSpan={2}>Balance</td>
                  <td className="px-5 py-4 text-right">{rs(bal.billed)}</td>
                  <td className="px-5 py-4 text-right">{rs(bal.paid)}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <span className={outstanding > 0 ? 'text-rose-600' : 'text-ink-400'}>{rs(outstanding)}</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Record payment */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-pop w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-extrabold text-ink-800">Record payment</div>
            <div className="text-sm text-ink-500 mt-1">
              {customer.name || 'Customer'} owes <span className="font-bold text-rose-600">{rs(outstanding)}</span>
              {' '}across {openBills.length} bill{openBills.length === 1 ? '' : 's'}
            </div>

            {/* A payment always clears one specific bill. */}
            <label className="block mt-5 text-xs font-semibold text-ink-500">Bill</label>
            <select value={receiptId} onChange={(e) => pickBill(e.target.value)} className={underline}>
              {openBills.map((b) => (
                <option key={b.id} value={b.id}>
                  {`${b.billRef || b.no} · ${fmtDate(b.saleDate)} · ${rs(b.balance)} due`}
                </option>
              ))}
            </select>

            <label className="block mt-4 text-xs font-semibold text-ink-500">Amount</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="numeric"
              autoFocus
              className={underline}
              placeholder="0"
            />
            <button className="mt-2 text-xs font-bold text-bf-700 hover:underline" onClick={() => setAmount(String(billDue))}>
              PAY THIS BILL IN FULL
            </button>

            <label className="block mt-4 text-xs font-semibold text-ink-500">Payment date</label>
            <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={underline} />

            <label className="block mt-4 text-xs font-semibold text-ink-500">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={underline} placeholder="e.g. cash, bank transfer" />

            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100 text-sm">
              <span className="text-ink-500">Remaining on this bill</span>
              <span className="font-bold text-ink-800">{rs(Math.max(0, billDue - entered))}</span>
            </div>
            <div className="flex items-center justify-between mt-1 text-sm">
              <span className="text-ink-500">Remaining on account</span>
              <span className="font-bold text-ink-800">{rs(Math.max(0, outstanding - entered))}</span>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <GhostBtn onClick={() => setOpen(false)}>Cancel</GhostBtn>
              <PrimaryBtn onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Record payment'}</PrimaryBtn>
            </div>
          </div>
        </div>
      )}
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
