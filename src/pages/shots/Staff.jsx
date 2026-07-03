import { useMemo, useState } from 'react';
import {
  Briefcase, Check, Copy, KeyRound, Mail, Plus, RefreshCw, Search, ShieldCheck,
  Trash2, UserPlus, X,
} from 'lucide-react';
import { PageHeader, StatCard, EmptyState } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import { createStaffLogin, supabase } from '../../lib/supabase.js';

// Roles an admin can assign. Only "Admin" (and the account owner) can see the
// Dashboard in the app; everyone else is limited to Memberships/Bookings/Expenses.
const ROLES = ['Admin', 'Manager', 'Cashier', 'Floor Staff', 'Receptionist', 'Maintenance'];
const DEFAULT_ROLE = 'Floor Staff';

export default function Staff() {
  const { staff, addStaff, deleteStaff, updateStaff } = useShots();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [resetFor, setResetFor] = useState(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((s) =>
      !q || (s.name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q)
    );
  }, [staff, query]);

  const handleDelete = (s) => {
    if (confirm(`Remove ${s.name || s.email} from the staff list? Their app login is not deleted, but they'll be removed here.`)) {
      deleteStaff(s.id);
    }
  };

  // Set the role in both the staff record (display) and profiles (app gating).
  const changeRole = async (s, role) => {
    updateStaff(s.id, { role });
    try {
      const { error } = await supabase.rpc('admin_set_staff_role', {
        target_email: s.email,
        new_role: role,
      });
      if (error) throw error;
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Role saved here, but the app permission could not be updated. Make sure the SQL function is installed.');
    }
  };

  return (
    <>
      <PageHeader
        title="Staff Logins"
        subtitle="Create the usernames (email) and passwords staff use to sign in to the mobile app."
        actions={<button onClick={() => setAddOpen(true)} className="btn-primary"><UserPlus className="w-4 h-4" /> Add login</button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <StatCard icon={Briefcase}   label="Staff logins" value={staff.length} sub="With app access" accent="brand" />
        <StatCard icon={ShieldCheck} label="Active"       value={staff.filter((s) => s.status !== 'Suspended').length} sub="Can sign in" accent="emerald" />
      </div>

      <div className="card p-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search by name or username (email)…"
            className="input pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Briefcase} title="No staff logins yet" message="Add a login to let a staff member sign in to the app." cta={<button onClick={() => setAddOpen(true)} className="btn-primary"><UserPlus className="w-4 h-4" /> Add login</button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((s) => (
            <div key={s.id} className="card card-hover p-5">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-gradient text-white font-extrabold flex items-center justify-center text-lg shadow-brand">
                  {(s.name || s.email || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-extrabold truncate">{s.name || 'Staff'}</div>
                  <div className="text-[12px] text-ink-500">App login</div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-ink-600">
                  <Mail className="w-4 h-4 text-ink-400" />
                  <span className="truncate" title={s.email}>{s.email || '—'}</span>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">Role</label>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    className="input py-2"
                    value={ROLES.includes(s.role) ? s.role : ''}
                    onChange={(e) => changeRole(s, e.target.value)}
                  >
                    {!ROLES.includes(s.role) && <option value="">{s.role || 'Not set'}</option>}
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  {['admin', 'owner'].includes(String(s.role || '').toLowerCase()) && (
                    <span className="chip bg-violet-100 text-violet-700 whitespace-nowrap">Dashboard</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4">
                <button onClick={() => setResetFor(s)} className="btn-ghost px-2.5 py-1.5 text-xs">
                  <KeyRound className="w-3.5 h-3.5" /> Reset password
                </button>
                <button onClick={() => handleDelete(s)} className="btn-danger px-2.5 py-1.5 text-xs">
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addOpen && <AddStaffModal onClose={() => setAddOpen(false)} addStaff={addStaff} />}
      {resetFor && <ResetPasswordModal staff={resetFor} onClose={() => setResetFor(null)} />}
    </>
  );
}

function ResetPasswordModal({ staff, onClose }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = async () => {
    setError('');
    if (!password || password.length < 6) return setError('Password must be at least 6 characters.');
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc('admin_set_staff_password', {
        target_email: staff.email,
        new_password: password,
      });
      if (rpcErr) throw rpcErr;
      setDone(true);
    } catch (e) {
      setError(e?.message || 'Could not update the password. Make sure the SQL function is installed.');
    } finally {
      setBusy(false);
    }
  };

  const copyCreds = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${staff.email}\nPassword: ${password}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — values are on screen */
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Reset password</div>
            <h3 className="text-xl font-extrabold">{staff.name || 'Staff'}</h3>
            <p className="text-xs text-ink-500 mt-0.5">{staff.email}</p>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {done ? (
          <>
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm text-ink-600 mb-3">
                Password updated. Share these credentials with the staff member — they use them to sign in to the <b>mobile app</b>.
              </p>
              <div className="space-y-2">
                <CredRow label="Email" value={staff.email} />
                <CredRow label="Password" value={password} />
              </div>
              <button onClick={copyCreds} className="btn-ghost mt-4 text-sm">
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy email & password'}
              </button>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={onClose} className="btn-primary">Done</button>
            </div>
          </>
        ) : (
          <>
            <label className="label">New password</label>
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
            <p className="text-[12px] text-ink-400 mt-1">The staff member will sign in with this immediately.</p>

            {error && (
              <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose} className="btn-ghost" disabled={busy}>Cancel</button>
              <button onClick={save} className="btn-primary" disabled={busy}>
                <KeyRound className="w-4 h-4" /> {busy ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
    name: '', email: '', role: DEFAULT_ROLE, status: 'Active',
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
    if (!form.email) return setError('Username (email) is required — it is the staff member’s login.');
    if (!password || password.length < 6) return setError('Password must be at least 6 characters.');

    setBusy(true);
    try {
      // 1) Create the app login account (auth.users + profiles via trigger).
      const { alreadyExisted } = await createStaffLogin({
        email: form.email,
        password,
        name: form.name || 'Staff',
        role: form.role,
      });
      // 2) Save the staff record (business data).
      await addStaff({ ...form, name: form.name || 'Staff' });
      // 3) Set the role in profiles so the app's Dashboard gate works.
      let roleWarning = false;
      try {
        const { error: roleErr } = await supabase.rpc('admin_set_staff_role', {
          target_email: form.email,
          new_role: form.role,
        });
        if (roleErr) roleWarning = true;
      } catch { roleWarning = true; }
      setDone({ email: form.email.trim(), password, alreadyExisted, role: form.role, roleWarning });
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
                <CredRow label="Role" value={done.role} />
              </div>
              {done.roleWarning && (
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-3">
                  Login created, but the role couldn’t be applied to app permissions. Run the <b>admin_set_staff_role</b> SQL function, then set the role again from the staff card.
                </div>
              )}
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
                <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">New login</div>
                <h3 className="text-xl font-extrabold">Add a staff login</h3>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Field label="Display name (optional)" placeholder="e.g. Yasir Hussain" value={form.name} onChange={(e) => set('name', e.target.value)} />
              <Field label="Username (email)" placeholder="staff@shots.com" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-[12px] text-ink-400 mt-1">Only <b>Admin</b> can see the Dashboard in the app.</p>
              </div>
              <div>
                <label className="label">Password</label>
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
                <p className="text-[12px] text-ink-400 mt-1">Share the username &amp; password with the staff member so they can sign in to the app.</p>
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
