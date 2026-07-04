import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Card, Field, PrimaryBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';

export default function EmployeeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { employees, roles, saveEmployee, deleteEmployee, role } = useMunchies();

  const existing = employees.find((e) => e.id === id);
  const [form, setForm] = useState(() =>
    existing || { name: '', email: '', phone: '', roleId: roles.find((r) => !r.system)?.id || roles[0]?.id || '' }
  );
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const selectedRole = role(form.roleId);
  const accessText =
    selectedRole?.access === 'pos'
      ? 'POS — can access the Munchies app only'
      : 'Back office and POS — full admin access';

  const onSave = () => {
    if (!form.name.trim()) return;
    saveEmployee({ ...form, name: form.name.trim() });
    navigate('/munchies/employees/list');
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
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-md bg-mun-50 border border-mun-100 px-3.5 py-2.5 text-xs text-mun-700">
          <span className="font-semibold">Access:</span>
          <span>{accessText}</span>
        </div>
      </Card>

      <div className="flex items-center justify-between mt-4 px-2">
        {existing && !existing.roleId?.includes('owner') ? (
          <button onClick={() => { deleteEmployee(existing.id); navigate('/munchies/employees/list'); }} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        ) : <span />}
        <div className="flex gap-3">
          <GhostBtn onClick={() => navigate('/munchies/employees/list')}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onSave}>Save</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
