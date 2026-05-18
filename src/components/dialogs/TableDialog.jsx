import { useEffect, useState } from 'react';
import { Hash, MapPin, Save, Trash2, X } from 'lucide-react';
import {
  tableConditions, tableLocations, tableStatuses, tableTypes,
  DEFAULT_OPEN, DEFAULT_CLOSE,
} from '../../data/shotsData.js';
import { useShots } from '../../store/ShotsStore.jsx';

const EMPTY = {
  number: '',
  type: 'Pool',
  location: 'Main Hall',
  status: 'Available',
  condition: 'Excellent',
  memberRate: 400,
  nonMemberRate: 600,
  openTime: DEFAULT_OPEN,
  closeTime: DEFAULT_CLOSE,
};

export default function TableDialog({ open, onClose, table }) {
  const { tables, addTable, updateTable, deleteTable } = useShots();
  const editing = !!table;
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) setForm({ ...EMPTY, ...table });
    else setForm({ ...EMPTY, number: tables.length ? Math.max(...tables.map((x) => x.number)) + 1 : 1 });
    setError('');
  }, [open, editing, table, tables]);

  if (!open) return null;

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const handleSave = () => {
    if (!form.number) return setError('Table number is required.');
    if (!editing && tables.some((t) => Number(t.number) === Number(form.number))) {
      return setError(`Table #${form.number} already exists.`);
    }
    const payload = {
      ...form,
      number: Number(form.number),
      memberRate: Number(form.memberRate),
      nonMemberRate: Number(form.nonMemberRate),
    };
    if (editing) updateTable(table.id, payload);
    else addTable(payload);
    onClose();
  };

  const handleDelete = () => {
    if (!editing) return;
    if (confirm(`Delete Table #${table.number}? This action cannot be undone.`)) {
      deleteTable(table.id);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-pop w-full max-w-xl p-6 animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">{editing ? 'Edit table' : 'New table'}</div>
            <h3 className="text-xl font-extrabold">{editing ? `Table #${table.number} · ${table.type}` : 'Add a table'}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Table number" icon={<Hash className="w-4 h-4 text-ink-400" />}>
            <input
              className="input pl-9"
              type="number"
              value={form.number}
              onChange={(e) => setField('number', e.target.value)}
            />
          </Field>
          <SelectField label="Type" value={form.type} onChange={(v) => setField('type', v)} options={tableTypes} />
          <SelectField label="Location" value={form.location} onChange={(v) => setField('location', v)} options={tableLocations} icon={<MapPin className="w-4 h-4 text-ink-400" />} />
          <SelectField label="Condition" value={form.condition} onChange={(v) => setField('condition', v)} options={tableConditions} />

          <Field label="Member rate (Rs / hr)">
            <input className="input" type="number" value={form.memberRate} onChange={(e) => setField('memberRate', e.target.value)} />
          </Field>
          <Field label="Non-member rate (Rs / hr)">
            <input className="input" type="number" value={form.nonMemberRate} onChange={(e) => setField('nonMemberRate', e.target.value)} />
          </Field>

          <Field label="Open">
            <input className="input" type="time" value={form.openTime} onChange={(e) => setField('openTime', e.target.value)} />
          </Field>
          <Field label="Close">
            <input className="input" type="time" value={form.closeTime} onChange={(e) => setField('closeTime', e.target.value)} />
          </Field>

          <SelectField label="Status" value={form.status} onChange={(v) => setField('status', v)} options={tableStatuses} />
          {form.status === 'Occupied' && (
            <Field label="Occupied by">
              <input className="input" value={form.occupiedBy || ''} onChange={(e) => setField('occupiedBy', e.target.value)} placeholder="Player name" />
            </Field>
          )}
        </div>

        {error && <div className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex items-center justify-between gap-2 mt-6">
          {editing ? (
            <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-4 h-4" /> Delete</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4" /> {editing ? 'Save changes' : 'Create table'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, icon }) {
  return (
    <Field label={label} icon={icon}>
      <select className={`input ${icon ? 'pl-9' : ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}
