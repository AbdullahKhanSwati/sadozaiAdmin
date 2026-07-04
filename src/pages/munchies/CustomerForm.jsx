import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Card, Field, PrimaryBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { COUNTRIES } from '../../data/munchiesCatalog.js';

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { customers, saveCustomer, deleteCustomer } = useMunchies();

  const existing = customers.find((c) => c.id === id);
  const [form, setForm] = useState(() =>
    existing || {
      name: '', email: '', phone: '', address: '', city: '', region: '',
      postalCode: '', country: '', note: '',
      firstVisit: '—', lastVisit: '—', visits: 0, spent: 0, points: 0,
    }
  );
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSave = () => {
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) return;
    saveCustomer(form);
    navigate('/munchies/customers');
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

      <div className="flex items-center justify-between mt-4 px-2">
        {existing ? (
          <button onClick={() => { deleteCustomer(existing.id); navigate('/munchies/customers'); }} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
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
