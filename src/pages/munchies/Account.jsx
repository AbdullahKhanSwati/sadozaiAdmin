import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Card, Field, Toggle, PrimaryBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const KEY = 'munchies.account.v1';

const CURRENCIES = [
  'Pakistani Rupee (PKR)', 'US Dollar (USD)', 'UK Pound (GBP)',
  'UAE Dirham (AED)', 'Indian Rupee (INR)', 'Saudi Riyal (SAR)',
];

const TIMEZONES = [
  '(UTC+05:00) Islamabad, Karachi',
  '(UTC+04:00) Abu Dhabi, Dubai',
  '(UTC+05:30) New Delhi',
  '(UTC+03:00) Riyadh',
  '(UTC+00:00) London',
  '(UTC-05:00) New York',
];

export default function Account() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [form, setForm] = useState(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* ignore */ }
    return {
      businessName: 'Munchies',
      email: session?.email || 'munchiesdoberan@gmail.com',
      password: 'admin123',
      currency: 'Pakistani Rupee (PKR)',
      usePaise: true,
      timezone: '(UTC+05:00) Islamabad, Karachi',
      ...saved,
    };
  });
  const [editEmail, setEditEmail] = useState(false);
  const [editPass, setEditPass] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const onSave = () => {
    try { localStorage.setItem(KEY, JSON.stringify(form)); } catch { /* ignore */ }
    navigate(-1);
  };

  const onDelete = () => {
    if (window.confirm('Permanently delete this account and all its data? This cannot be undone.')) {
      // UI-only: no real deletion.
      window.alert('Account deletion is disabled in this demo.');
    }
  };

  return (
    <div className="max-w-[720px] mx-auto pb-24">
      <Card className="px-6 sm:px-8 pt-6">
        {/* Business name */}
        <Field label="Business name">
          <input value={form.businessName} onChange={(e) => set({ businessName: e.target.value })} className={underline} />
        </Field>

        {/* Email (pencil to edit) */}
        <div className="mt-8">
          <div className="text-xs text-ink-400 mb-1">Email</div>
          <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
            {editEmail ? (
              <input value={form.email} onChange={(e) => set({ email: e.target.value })} className="flex-1 bg-transparent text-ink-800 focus:outline-none" autoFocus />
            ) : (
              <span className="flex-1 text-ink-800">{form.email}</span>
            )}
            <button onClick={() => setEditEmail((v) => !v)} className="text-ink-400 hover:text-ink-600"><Pencil className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Password (pencil to edit) */}
        <div className="mt-8">
          <div className="text-xs text-ink-400 mb-1">Password</div>
          <div className="flex items-center gap-2 border-b border-slate-300 pb-2">
            {editPass ? (
              <input type="text" value={form.password} onChange={(e) => set({ password: e.target.value })} className="flex-1 bg-transparent text-ink-800 focus:outline-none" autoFocus />
            ) : (
              <span className="flex-1 text-ink-800 tracking-widest">••••••••</span>
            )}
            <button onClick={() => setEditPass((v) => !v)} className="text-ink-400 hover:text-ink-600"><Pencil className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Currency */}
        <div className="mt-8">
          <Field label="Currency">
            <select value={form.currency} onChange={(e) => set({ currency: e.target.value })} className={underline}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        {/* Use paise */}
        <div className="mt-6 flex items-center justify-between py-2">
          <span className="text-ink-800">Use paise</span>
          <Toggle on={form.usePaise} onChange={(v) => set({ usePaise: v })} />
        </div>

        {/* Timezone */}
        <div className="mt-4">
          <Field label="Timezone">
            <select value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} className={underline}>
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>

        {/* Delete account */}
        <div className="mt-10 border-t border-slate-100 py-6 flex items-start justify-between gap-4">
          <div>
            <div className="text-ink-800 font-medium">Delete account</div>
            <div className="text-sm text-ink-400 mt-0.5 max-w-sm">You can permanently delete your Munchies account and all its data</div>
          </div>
          <button onClick={onDelete} className="text-mun-600 font-bold uppercase tracking-wide text-sm hover:text-mun-700 shrink-0">Delete</button>
        </div>
      </Card>

      <div className="flex justify-end gap-3 mt-4">
        <GhostBtn onClick={() => navigate(-1)}>Cancel</GhostBtn>
        <PrimaryBtn onClick={onSave}>Save</PrimaryBtn>
      </div>
    </div>
  );
}
