import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, Field, PrimaryBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { createMunchiesLogin, adminSetStaffPassword, adminSetStaffRole, adminDeleteStaff } from '../../lib/supabaseMunchies.js';
import { EditGate } from './formGate.jsx';

// Access → login role: 'both' (admin) gets full access, 'pos' is staff (app only).
const loginRole = (role) => (role?.access === 'both' ? 'admin' : 'staff');

export default function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { employees, roles, saveEmployee, deleteEmployee, role, ready } = useMunchies();

  const existing = employees.find((e) => e.id === id);
  const [form, setForm] = useState(() =>
    existing || { name: '', email: '', phone: '', roleId: roles.find((r) => !r.system)?.id || roles[0]?.id || '' }
  );
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (existing) setForm(existing); }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (id && !existing) return <EditGate id={id} existing={existing} ready={ready} />;

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const selectedRole = role(form.roleId);
  const hasLogin = !!existing?.userId;

  const accessText =
    selectedRole?.access === 'pos'
      ? 'POS — can sign in to the Munchies app only'
      : 'Back office and POS — full admin access (app + admin panel)';

  const onDelete = async () => {
    if (!window.confirm('Delete this employee? Their app login will also be removed.')) return;
    setSaving(true);
    setError('');
    try {
      if (existing.email) await adminDeleteStaff(existing.email).catch(() => {});
      await deleteEmployee(existing.id);
      navigate('/munchies/employees/list');
    } catch (e) {
      setError(e?.message || 'Could not delete the employee.');
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (!existing) {
        // New employee. If email + password given, create their app login.
        let userId = null;
        if (form.email.trim() && password) {
          if (password.length < 6) throw new Error('Password must be at least 6 characters.');
          const { user, alreadyExisted } = await createMunchiesLogin({
            email: form.email, password, name: form.name, role: loginRole(selectedRole),
          });
          if (alreadyExisted) {
            // Login already exists — just (re)assert its role.
            await adminSetStaffRole(form.email, loginRole(selectedRole));
          } else {
            userId = user?.id || null;
          }
        }
        await saveEmployee({ ...form, name: form.name.trim(), userId });
      } else {
        // Editing. Persist record; sync login role + optional password reset.
        await saveEmployee({ ...form, name: form.name.trim() });
        if (form.email.trim()) {
          await adminSetStaffRole(form.email, loginRole(selectedRole)).catch(() => {});
          if (password) {
            if (password.length < 6) throw new Error('Password must be at least 6 characters.');
            await adminSetStaffPassword(form.email, password);
          }
        }
      }
      navigate('/munchies/employees/list');
    } catch (e) {
      setError(e?.message || 'Could not save the employee.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[820px] mx-auto pb-24">
      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" className={[underline, 'text-xl md:col-span-2'].join(' ')} />
          <Field label="Email">
            <input value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="email@example.com" className={underline} type="email" />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="03xxxxxxxxx" className={underline} />
          </Field>
          <Field label="Role">
            <select value={form.roleId} onChange={(e) => set({ roleId: e.target.value })} className={underline}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label={existing ? (hasLogin ? 'Reset password (optional)' : 'Set password (optional)') : 'Password (creates an app login)'}>
            <div className="flex items-center gap-2 border-b border-slate-300">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPass ? 'text' : 'password'}
                placeholder={existing ? 'Leave blank to keep' : 'Min 6 characters'}
                className="flex-1 bg-transparent py-2 text-ink-800 focus:outline-none"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="text-ink-400 hover:text-ink-600">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-md bg-mun-50 border border-mun-100 px-3.5 py-2.5 text-xs text-mun-700">
          <span className="font-semibold">Access:</span>
          <span>{accessText}</span>
        </div>

        {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
      </Card>

      <div className="flex items-center justify-between mt-4 px-2">
        {existing && existing.id !== 'emp-owner' ? (
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        ) : <span />}
        <div className="flex gap-3">
          <GhostBtn onClick={() => navigate('/munchies/employees/list')}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
