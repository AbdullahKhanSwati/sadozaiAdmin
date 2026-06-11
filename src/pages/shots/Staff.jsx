import { useMemo, useState } from 'react';
import {
  Briefcase, Check, Copy, Mail, Phone, Plus, RefreshCw, Search, ShieldCheck,
  UserPlus, Wallet, X,
} from 'lucide-react';
import { rupees } from '../../data/shotsData.js';
import { FilterChips, PageHeader, StatCard, StatusPill, EmptyState } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import { createStaffLogin } from '../../lib/supabase.js';

const FILTERS = (list) => [
  { value: 'All',      label: 'All',      count: list.length },
  { value: 'Active',   label: 'Active',   count: list.filter((s) => s.status === 'Active').length },
  { value: 'On Leave', label: 'On leave', count: list.filter((s) => s.status === 'On Leave').length },
];

export default function Staff() {
  const { staff, addStaff } = useShots();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [addOpen, setAddOpen] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((s) => {
      const matchQ = !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
      const matchS = status === 'All' || s.status === status;
      return matchQ && matchS;
    });
  }, [query, status]);

  return (
    <>
      <PageHeader
        title="Staff & users"
        subtitle="Manage staff accounts, roles, and salaries."
        actions={<button onClick={() => setAddOpen(true)} className="btn-primary"><UserPlus className="w-4 h-4" /> Add staff</button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Briefcase}   label="Total staff" value={staff.length} sub="Across all roles" accent="brand" />
        <StatCard icon={ShieldCheck} label="Active"      value={staff.filter((s) => s.status === 'Active').length} sub="Working now" accent="emerald" />
        <StatCard icon={Briefcase}   label="On leave"    value={staff.filter((s) => s.status === 'On Leave').length} sub="Temporary absence" accent="amber" />
        <StatCard icon={Wallet}      label="Monthly payroll" value={rupees(staff.reduce((s, x) => s + (x.salary || 0), 0))} sub="Total salaries" accent="indigo" />
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search staff, role, email…"
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <FilterChips value={status} onChange={setStatus} items={FILTERS(staff)} />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Briefcase} title="No staff match" message="Try different filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((s) => (
            <div key={s.id} className="card card-hover p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-gradient text-white font-extrabold flex items-center justify-center text-lg shadow-brand">
                  {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold truncate">{s.name}</div>
                  <div className="text-[12px] text-ink-500">{s.role}</div>
                </div>
                <StatusPill value={s.status} />
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-ink-600">
                  <Mail className="w-4 h-4 text-ink-400" />
                  <span className="truncate">{s.email}</span>
                </div>
                <div className="flex items-center gap-2 text-ink-600">
                  <Phone className="w-4 h-4 text-ink-400" />
                  <span>{s.phone}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">Joined</div>
                  <div className="font-semibold text-sm mt-0.5">{new Date(s.joinedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">Salary</div>
                  <div className="font-extrabold text-sm mt-0.5">{rupees(s.salary)}</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4">
                <button className="btn-ghost px-2.5 py-1.5 text-xs">Edit</button>
                <button className="btn-primary px-2.5 py-1.5 text-xs">Manage</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && <AddStaffModal onClose={() => setAddOpen(false)} addStaff={addStaff} />}
    </>
  );
}

function generatePassword() {
  // Readable but strong: avoids ambiguous chars, mixes case/digits/symbol.
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#%&*';
  const all = upper + lower + digits + symbols;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  let out = pick(upper) + pick(lower) + pick(digits) + pick(symbols);
  for (let i = 0; i < 6; i++) out += pick(all);
  return out.split('').sort(() => Math.random() - 0.5).join('');
}

function AddStaffModal({ onClose, addStaff }) {
  const [form, setForm] = useState({
    name: '', role: '', email: '', phone: '', salary: '', status: 'Active',
    joinedAt: new Date().toISOString().slice(0, 10),
  });
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // { email, password, alreadyExisted }
  const [copied, setCopied] = useState(false);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    setError('');
    if (!form.name || !form.role) return setError('Name and role are required.');
    if (!form.email) return setError('Email is required — it is the staff member’s login.');
    if (!password || password.length < 6) return setError('Password must be at least 6 characters.');

    setBusy(true);
    try {
      // 1) Create the app login account (auth.users + profiles via trigger).
      const { alreadyExisted } = await createStaffLogin({
        email: form.email,
        password,
        name: form.name,
      });
      // 2) Save the staff record (business data).
      await addStaff({ ...form, salary: Number(form.salary) || 0 });
      setDone({ email: form.email.trim(), password, alreadyExisted });
    } catch (e) {
      setError(e?.message || 'Could not create the login. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyCreds = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${done.email}\nPassword: ${done.password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard may be blocked; the values are visible on screen anyway */
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-emerald-500 font-bold">Login created</div>
                <h3 className="text-xl font-extrabold">{form.name} can now sign in</h3>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={onClose}><X className="w-5 h-5" /></button>
            </div>

            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm text-ink-600 mb-3">
                Share these credentials with the staff member. They use them to log into the <b>mobile app</b>.
                {done.alreadyExisted && ' (An account already existed for this email — the staff record was saved and the existing password still applies.)'}
              </p>
              <div className="space-y-2">
                <CredRow label="Email" value={done.email} />
                <CredRow label="Password" value={done.alreadyExisted ? '•••••• (unchanged)' : done.password} />
              </div>
              {!done.alreadyExisted && (
                <button onClick={copyCreds} className="btn-ghost mt-4 text-sm">
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy email & password'}
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose} className="btn-primary">Done</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">New staff</div>
                <h3 className="text-xl font-extrabold">Add a staff member</h3>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name" placeholder="Yasir Hussain" value={form.name} onChange={(e) => set('name', e.target.value)} />
              <Field label="Role" placeholder="Floor Staff" value={form.role} onChange={(e) => set('role', e.target.value)} />
              <Field label="Email (login)" placeholder="staff@shots.com" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              <Field label="Phone" placeholder="+923XXXXXXXXX" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              <div className="sm:col-span-2">
                <label className="label">Password (login)</label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    type="text"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => setPassword(generatePassword())}>
                    <RefreshCw className="w-4 h-4" /> Generate
                  </button>
                </div>
                <p className="text-[12px] text-ink-400 mt-1">Shown so you can share it with the staff member.</p>
              </div>
              <Field label="Salary (Rs.)" placeholder="0" type="number" value={form.salary} onChange={(e) => set('salary', e.target.value)} />
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                  <option>Active</option>
                  <option>On Leave</option>
                  <option>Suspended</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose} className="btn-ghost" disabled={busy}>Cancel</button>
              <button onClick={save} className="btn-primary" disabled={busy}>
                <Plus className="w-4 h-4" /> {busy ? 'Creating…' : 'Create staff & login'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CredRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white border border-emerald-200 px-4 py-2.5">
      <span className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">{label}</span>
      <span className="font-mono font-bold text-ink-800 truncate">{value}</span>
    </div>
  );
}

function Field({ label, ...rest }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...rest} />
    </div>
  );
}
