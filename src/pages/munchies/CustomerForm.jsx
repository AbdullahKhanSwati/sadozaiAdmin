import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Receipt } from 'lucide-react';
import { Card, Field, PrimaryBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { COUNTRIES } from '../../data/munchiesCatalog.js';
import { rs } from '../../data/munchiesData.js';

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { customers, saveCustomer, deleteCustomer, reports } = useMunchies();

  const existing = customers.find((c) => c.id === id);
  const purchases = existing ? reports.receiptRows.filter((r) => r.customerId === existing.id) : [];
  const [form, setForm] = useState(() =>
    existing || {
      name: '', email: '', phone: '', address: '', city: '', region: '',
      postalCode: '', country: '', note: '',
      firstVisit: '—', lastVisit: '—', visits: 0, spent: 0, points: 0,
    }
  );
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSave = async () => {
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) return;
    try {
      await saveCustomer(form);
      navigate('/munchies/customers');
    } catch (e) { window.alert(e?.message || 'Could not save the customer.'); }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this customer?')) return;
    try { await deleteCustomer(existing.id); navigate('/munchies/customers'); }
    catch (e) { window.alert(e?.message || 'Could not delete the customer.'); }
  };

  return (
    <div className="max-w-[900px] mx-auto pb-24">
      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" className={[underline, 'text-xl md:col-span-2'].join(' ')} />
          <Field label="Email"><input value={form.email} onChange={(e) => set({ email: e.target.value })} type="email" className={underline} /></Field>
          <Field label="Phone"><input value={form.phone} onChange={(e) => set({ phone: e.target.value })} className={underline} /></Field>
        </div>

        <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mt-10 mb-4">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <Field label="Address"><input value={form.address} onChange={(e) => set({ address: e.target.value })} className={underline} /></Field>
          <Field label="City"><input value={form.city} onChange={(e) => set({ city: e.target.value })} className={underline} /></Field>
          <Field label="Region / State"><input value={form.region} onChange={(e) => set({ region: e.target.value })} className={underline} /></Field>
          <Field label="Postal code"><input value={form.postalCode} onChange={(e) => set({ postalCode: e.target.value })} className={underline} /></Field>
          <Field label="Country">
            <select value={form.country} onChange={(e) => set({ country: e.target.value })} className={underline}>
              <option value="">Select country</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <h3 className="text-sm font-semibold text-ink-500 uppercase tracking-wider mt-10 mb-4">Notes</h3>
        <textarea value={form.note} onChange={(e) => set({ note: e.target.value })} rows={3} placeholder="Note" className="w-full border border-slate-200 rounded-md p-3 text-sm text-ink-700 placeholder:text-slate-400 focus:outline-none focus:border-mun-400" />
      </Card>

      {existing && (
        <Card className="mt-4 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
            <Receipt className="w-5 h-5 text-mun-600" />
            <h3 className="font-semibold text-ink-800">Purchase history</h3>
            <span className="text-xs text-ink-400">({purchases.length})</span>
          </div>
          {purchases.length === 0 ? (
            <div className="px-6 py-8 text-sm text-ink-400 text-center">No purchases yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-500">
                  <th className="text-left font-medium px-6 py-3">Receipt</th>
                  <th className="text-left font-medium px-6 py-3">Date</th>
                  <th className="text-left font-medium px-6 py-3">Type</th>
                  <th className="text-right font-medium px-6 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.no} className="border-t border-slate-100">
                    <td className="px-6 py-3 text-ink-700">{p.no}</td>
                    <td className="px-6 py-3 text-ink-600">{p.date}</td>
                    <td className="px-6 py-3 text-ink-600">{p.type}</td>
                    <td className="px-6 py-3 text-right font-semibold text-ink-800">{rs(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <div className="flex items-center justify-between mt-4 px-2">
        {existing ? (
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        ) : <span />}
        <div className="flex gap-3">
          <GhostBtn onClick={() => navigate('/munchies/customers')}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onSave}>Save</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
