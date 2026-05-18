import { useMemo, useState } from 'react';
import {
  Briefcase, Mail, Phone, Plus, Search, ShieldCheck, UserPlus, Wallet, X,
} from 'lucide-react';
import { rupees } from '../../data/shotsData.js';
import { FilterChips, PageHeader, StatCard, StatusPill, EmptyState } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';

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

      {addOpen && <AddStaffModal onClose={() => setAddOpen(false)} onSave={(data) => { addStaff(data); setAddOpen(false); }} />}
    </>
  );
}

function AddStaffModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', role: '', email: '', phone: '', salary: '', status: 'Active',
    joinedAt: new Date().toISOString().slice(0, 10),
  });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const save = () => {
    if (!form.name || !form.role) return;
    onSave({ ...form, salary: Number(form.salary) || 0 });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-2xl p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
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
          <Field label="Email" placeholder="staff@shots.com" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Field label="Phone" placeholder="+923XXXXXXXXX" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
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
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary"><Plus className="w-4 h-4" /> Create staff</button>
        </div>
      </div>
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
