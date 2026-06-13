import { useEffect, useRef, useState } from 'react';
import { Hash, Image as ImageIcon, Save, Trash2, X } from 'lucide-react';
import { DEFAULT_OPEN, DEFAULT_CLOSE } from '../../data/shotsData.js';
import { useShots } from '../../store/ShotsStore.jsx';
import { uploadToBucket } from '../../lib/supabase.js';

const EMPTY = {
  number: '',
  type: '',
  memberRate: 400,
  nonMemberRate: 600,
  openTime: DEFAULT_OPEN,
  closeTime: DEFAULT_CLOSE,
  image: null,
};

export default function TableDialog({ open, onClose, table }) {
  const { tables, tableTypes, addTable, updateTable, deleteTable } = useShots();
  const editing = !!table;
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef(null);

  const typeOptions = tableTypes.map((t) => t.name);

  useEffect(() => {
    if (!open) return;
    const defaultType = tableTypes[0]?.name || '';
    if (editing) {
      setForm({ ...EMPTY, ...table, type: table.type || defaultType });
    } else {
      setForm({
        ...EMPTY,
        type: defaultType,
        number: tables.length ? Math.max(...tables.map((x) => x.number)) + 1 : 1,
      });
    }
    setImageFile(null);
    setError('');
  }, [open, editing, table, tables, tableTypes]);

  if (!open) return null;

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onPickImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setField('image', ev.target.result); // data URL preview
    reader.readAsDataURL(f);
  };

  const handleSave = async () => {
    setError('');
    if (!form.number) return setError('Table number is required.');
    if (!form.type) return setError('Pick a table type (or add one first).');
    if (!editing && tables.some((t) => Number(t.number) === Number(form.number))) {
      return setError(`Table #${form.number} already exists.`);
    }

    setSaving(true);
    let image = form.image;
    try {
      if (imageFile) image = await uploadToBucket('member-photos', imageFile, 'tables/');
    } catch (e) {
      setSaving(false);
      return setError(`Image upload failed: ${e?.message || 'unknown error'}`);
    }

    const payload = {
      number: Number(form.number),
      type: form.type,
      memberRate: Number(form.memberRate),
      nonMemberRate: Number(form.nonMemberRate),
      openTime: form.openTime,
      closeTime: form.closeTime,
      image,
    };
    // New tables are Available by default (status is no longer set manually here).
    if (!editing) payload.status = 'Available';

    try {
      if (editing) await updateTable(table.id, payload);
      else await addTable(payload);
      onClose();
    } finally {
      setSaving(false);
    }
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

        {/* Table image */}
        <div className="mb-4">
          <label className="label">Table photo</label>
          <button
            type="button"
            onClick={() => { if (form.image) { setField('image', null); setImageFile(null); } else imageInputRef.current?.click(); }}
            className="w-full rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 hover:bg-brand-100 transition overflow-hidden"
          >
            {form.image ? (
              <div className="relative">
                <img src={form.image} alt="" className="w-full h-40 object-cover" />
                <span className="absolute top-2 right-2 bg-black/60 text-white text-[11px] font-bold px-2 py-1 rounded-full inline-flex items-center gap-1">
                  <X className="w-3 h-3" /> Remove
                </span>
              </div>
            ) : (
              <div className="px-4 py-6 flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-brand-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-brand-700">Add table photo</div>
                  <div className="text-[11px] text-ink-500">Select an image from your files</div>
                </div>
              </div>
            )}
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
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

          <Field label="Type">
            {typeOptions.length > 0 ? (
              <select className="input" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                {!form.type && <option value="">Select type…</option>}
                {typeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <div className="text-xs text-ink-500 px-1 py-2">No types yet — add one via “Manage types”.</div>
            )}
          </Field>

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
        </div>

        {error && <div className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex items-center justify-between gap-2 mt-6">
          {editing ? (
            <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-4 h-4" /> Delete</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary"><Save className="w-4 h-4" /> {saving ? 'Saving…' : editing ? 'Save changes' : 'Create table'}</button>
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
