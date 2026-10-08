import { useMemo, useState } from 'react';
import { PawPrint, Plus, Download, Pencil, Trash2, Tags, Search, ImagePlus } from 'lucide-react';
import { rs } from '../../data/munchiesData.js';
import { downloadCsv, csvDate } from '../../lib/csv.js';
import { uploadItemImage } from '../../lib/supabaseFarm.js';
import { useFarm } from '../../store/FarmStore.jsx';
import { usePagination, TablePagination } from './bfUi.jsx';
import {
  today, monthStart, fmtDate, exportDate, ageLabel, qtyFmt, STATUSES, statusOf, GENDERS,
  inputCls, Label, Modal, StatTile,
} from './farmUi.jsx';

// Livestock — every animal on the farm (same data as the app's Livestock
// screen): tag / code, type, status, gender, breed, dates, purchase price,
// notes and a photo. Each animal shows what it produced and what was spent on
// it, so the owner can see which animals pay their way.
const EMPTY = {
  id: null, code: '', name: '', category_id: '', status: 'active', gender: '', breed: '',
  birth_date: '', acquired_on: '', purchase_price: '', notes: '', image: '',
};

export default function Livestock() {
  const {
    livestock, livestockCategories, production, expenses, saveFarmRow, deleteFarmRow,
    livestockCategoryName,
  } = useFarm();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');          // '' = all types
  const [status, setStatus] = useState('active'); // '' = all
  const [form, setForm] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const mtd = monthStart();
  // Per-animal totals: production (by product, all time + this month) and expenses.
  const stats = useMemo(() => {
    const m = {};
    const of = (id) => (m[id] = m[id] || { prod: {}, prodMonth: {}, spent: 0, spentMonth: 0, records: 0 });
    production.forEach((p) => {
      if (!p.livestock_id) return;
      const s = of(p.livestock_id);
      const k = `${p.product || 'Other'}|${p.unit || ''}`;
      s.prod[k] = (s.prod[k] || 0) + (Number(p.quantity) || 0);
      if ((p.produced_on || '') >= mtd) s.prodMonth[k] = (s.prodMonth[k] || 0) + (Number(p.quantity) || 0);
      s.records += 1;
    });
    expenses.forEach((e) => {
      if (!e.livestock_id) return;
      const s = of(e.livestock_id);
      s.spent += Number(e.amount) || 0;
      if ((e.spent_on || '') >= mtd) s.spentMonth += Number(e.amount) || 0;
    });
    return m;
  }, [production, expenses, mtd]);
  const statFor = (id) => stats[id] || { prod: {}, prodMonth: {}, spent: 0, spentMonth: 0, records: 0 };
  const prodText = (obj) => Object.entries(obj).map(([k, v]) => `${qtyFmt(v)} ${k.split('|')[1] || ''} ${k.split('|')[0]}`.replace(/\s+/g, ' ').trim()).join(', ');

  const filtered = useMemo(() => livestock.filter((a) => {
    if (type && a.category_id !== type) return false;
    if (status && (a.status || 'active') !== status) return false;
    if (q) {
      const t = `${a.code || ''} ${a.name || ''} ${a.breed || ''}`.toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [livestock, type, status, q]);
  const { pageItems, ...pager } = usePagination(filtered, 25);

  const activeCount = livestock.filter((a) => (a.status || 'active') === 'active').length;
  const byType = useMemo(() => {
    const m = {};
    livestock.filter((a) => (a.status || 'active') === 'active').forEach((a) => {
      const n = livestockCategoryName(a.category_id);
      m[n] = (m[n] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [livestock, livestockCategoryName]);
  const monthProd = useMemo(() => {
    const m = {};
    production.filter((p) => (p.produced_on || '') >= mtd).forEach((p) => {
      const k = `${p.product || 'Other'}|${p.unit || ''}`;
      m[k] = (m[k] || 0) + (Number(p.quantity) || 0);
    });
    return m;
  }, [production, mtd]);
  const monthAnimalSpend = expenses
    .filter((e) => e.livestock_id && (e.spent_on || '') >= mtd)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const openNew = () => setForm({ ...EMPTY, category_id: type || livestockCategories[0]?.id || '', acquired_on: today() });
  const openEdit = (a) => setForm({
    ...EMPTY, ...a,
    category_id: a.category_id || '', gender: a.gender || '', breed: a.breed || '',
    birth_date: a.birth_date || '', acquired_on: a.acquired_on || '',
    purchase_price: a.purchase_price ? String(a.purchase_price) : '', notes: a.notes || '', image: a.image || '',
  });

  const save = async () => {
    if (!form.name.trim()) return window.alert('Enter a name for the animal.');
    setSaving(true);
    try {
      await saveFarmRow('livestock', {
        id: form.id || undefined,
        code: form.code.trim() || null,
        name: form.name.trim(),
        category_id: form.category_id || null,
        status: form.status || 'active',
        gender: form.gender || null,
        breed: form.breed.trim() || null,
        birth_date: form.birth_date || null,
        acquired_on: form.acquired_on || null,
        purchase_price: Number(form.purchase_price) || 0,
        notes: form.notes.trim() || null,
        image: form.image || null,
      });
      setForm(null);
    } catch (e) {
      window.alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a) => {
    const s = statFor(a.id);
    const extra = s.records || s.spent
      ? `\n\nIts ${s.records} production record(s) and ${rs(s.spent)} of expenses are KEPT (they keep the animal's name). To keep the animal on the books, mark it Sold or Dead instead.`
      : '';
    if (!window.confirm(`Delete ${[a.code, a.name].filter(Boolean).join(' · ')}?${extra}`)) return;
    try { await deleteFarmRow('livestock', a.id); setDetailId(null); } catch (e) { window.alert(e.message); }
  };

  const onPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadItemImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (e) {
      window.alert(e.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const onExport = () => downloadCsv(`farm-livestock-${csvDate()}.csv`, [
    { label: 'Tag / code', value: (a) => a.code || '' },
    { label: 'Name', value: 'name' },
    { label: 'Type', value: (a) => livestockCategoryName(a.category_id) },
    { label: 'Status', value: (a) => statusOf(a.status).label },
    { label: 'Gender', value: (a) => (a.gender ? a.gender[0].toUpperCase() + a.gender.slice(1) : '') },
    { label: 'Breed', value: (a) => a.breed || '' },
    { label: 'Date of birth', value: (a) => exportDate(a.birth_date) },
    { label: 'Age', value: (a) => (a.birth_date ? ageLabel(a.birth_date) : '') },
    { label: 'Acquired on', value: (a) => exportDate(a.acquired_on) },
    { label: 'Purchase price', value: (a) => Number(a.purchase_price) || 0 },
    { label: 'Production (all time)', value: (a) => prodText(statFor(a.id).prod) },
    { label: 'Expenses (all time)', value: (a) => statFor(a.id).spent },
    { label: 'Notes', value: (a) => a.notes || '' },
  ], filtered);

  const detail = detailId ? livestock.find((a) => a.id === detailId) : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Active animals" value={activeCount} sub={byType.map(([n, c]) => `${n} ${c}`).join(' · ') || 'None yet'} />
        <StatTile label="Production this month" value={prodText(monthProd) || '—'} />
        <StatTile label="Spent on animals this month" value={rs(monthAnimalSpend)} tone="text-rose-600" />
        <StatTile label="Sold / dead" value={`${livestock.filter((a) => a.status === 'sold').length} / ${livestock.filter((a) => a.status === 'dead').length}`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 p-4 border-b border-slate-100">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tag, name or breed" className={`${inputCls} pl-9`} />
          </div>
          <select value={type} onChange={(e) => setType(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All types</option>
            {livestockCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button onClick={() => setTypesOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-600 hover:bg-slate-50">
            <Tags className="w-4 h-4" /> Types
          </button>
          <button onClick={onExport} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-600 hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700">
            <Plus className="w-4 h-4" /> Add animal
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-4 py-3">Animal</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-left font-medium px-4 py-3">Gender / breed</th>
                <th className="text-left font-medium px-4 py-3">Age</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Produced this month</th>
                <th className="text-right font-medium px-4 py-3">Expenses</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-400">No animals match.</td></tr>
              )}
              {pageItems.map((a) => {
                const s = statFor(a.id);
                const st = statusOf(a.status);
                return (
                  <tr key={a.id} onClick={() => setDetailId(a.id)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {a.image
                          ? <img src={a.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0" />
                          : <div className="w-10 h-10 rounded-lg bg-bf-50 text-bf-600 flex items-center justify-center shrink-0"><PawPrint className="w-5 h-5" /></div>}
                        <div className="min-w-0">
                          <div className="font-semibold text-ink-800 truncate">{a.name}</div>
                          <div className="text-xs text-ink-400">{a.code || 'No tag'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{livestockCategoryName(a.category_id)}</td>
                    <td className="px-4 py-3 text-ink-700 capitalize">{[a.gender, a.breed].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-4 py-3 text-ink-700">{ageLabel(a.birth_date)}</td>
                    <td className="px-4 py-3"><span className={['px-2 py-0.5 rounded-full text-xs font-semibold', st.tone].join(' ')}>{st.label}</span></td>
                    <td className="px-4 py-3 text-ink-700">{prodText(s.prodMonth) || '—'}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-semibold whitespace-nowrap">{s.spent ? rs(s.spent) : '—'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openEdit(a)} className="text-slate-400 hover:text-bf-600 p-1"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(a)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <TablePagination {...pager} />
      </div>

      {/* ---- Animal detail ---- */}
      {detail && (
        <AnimalDetail
          animal={detail}
          typeName={livestockCategoryName(detail.category_id)}
          production={production.filter((p) => p.livestock_id === detail.id)}
          expenses={expenses.filter((e) => e.livestock_id === detail.id)}
          prodText={prodText}
          stat={statFor(detail.id)}
          onClose={() => setDetailId(null)}
          onEdit={() => { setDetailId(null); openEdit(detail); }}
          onDelete={() => remove(detail)}
        />
      )}

      {/* ---- Add / edit ---- */}
      {form && (
        <Modal
          title={form.id ? 'Edit animal' : 'Add animal'}
          onClose={() => setForm(null)}
          wide
          footer={(
            <>
              <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold text-ink-500 hover:text-ink-700">Cancel</button>
              <button onClick={save} disabled={saving || uploading} className="px-4 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save animal'}
              </button>
            </>
          )}
        >
          <div className="grid sm:grid-cols-[140px_1fr] gap-5">
            <div>
              <Label>Photo</Label>
              <label className="block w-full aspect-square rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden cursor-pointer hover:border-bf-400">
                {form.image
                  ? <img src={form.image} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex flex-col items-center justify-center text-ink-400 text-xs gap-1"><ImagePlus className="w-6 h-6" />{uploading ? 'Uploading…' : 'Add photo'}</div>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
              </label>
              {form.image && <button onClick={() => setForm((f) => ({ ...f, image: '' }))} className="mt-1 text-xs text-rose-600 font-semibold">Remove photo</button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tag / code</Label><input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. B-12" className={inputCls} /></div>
              <div><Label>Name *</Label><input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Rani" className={inputCls} /></div>
              <div>
                <Label>Type</Label>
                <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className={inputCls}>
                  <option value="">No type</option>
                  {livestockCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Status</Label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className={inputCls}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <Label>Gender</Label>
                <select value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} className={inputCls}>
                  {GENDERS.map((g) => <option key={g.label} value={g.value}>{g.label}</option>)}
                </select>
              </div>
              <div><Label>Breed</Label><input value={form.breed} onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))} placeholder="e.g. Nili-Ravi" className={inputCls} /></div>
              <div><Label>Date of birth</Label><input type="date" value={form.birth_date} max={today()} onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))} className={inputCls} /></div>
              <div><Label>Acquired on</Label><input type="date" value={form.acquired_on} max={today()} onChange={(e) => setForm((f) => ({ ...f, acquired_on: e.target.value }))} className={inputCls} /></div>
              <div className="col-span-2"><Label>Purchase price (Rs)</Label><input inputMode="decimal" value={form.purchase_price} onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0" className={inputCls} /></div>
              <div className="col-span-2"><Label>Notes</Label><textarea rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Health, vaccinations, anything worth remembering" className={inputCls} /></div>
            </div>
          </div>
        </Modal>
      )}

      {typesOpen && <LivestockTypesDialog onClose={() => setTypesOpen(false)} />}
    </div>
  );
}

function AnimalDetail({ animal: a, typeName, production, expenses, prodText, stat, onClose, onEdit, onDelete }) {
  const st = statusOf(a.status);
  const recent = production.slice(0, 15);
  return (
    <Modal
      title={[a.code, a.name].filter(Boolean).join(' · ')}
      onClose={onClose}
      wide
      footer={(
        <>
          <button onClick={onDelete} className="mr-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /> Delete</button>
          <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-700 hover:bg-slate-50"><Pencil className="w-4 h-4" /> Edit</button>
        </>
      )}
    >
      <div className="grid sm:grid-cols-[160px_1fr] gap-5">
        {a.image
          ? <img src={a.image} alt="" className="w-full aspect-square rounded-lg object-cover bg-slate-100" />
          : <div className="w-full aspect-square rounded-lg bg-bf-50 text-bf-600 flex items-center justify-center"><PawPrint className="w-10 h-10" /></div>}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Info label="Type" value={typeName} />
          <Info label="Status" value={<span className={['px-2 py-0.5 rounded-full text-xs font-semibold', st.tone].join(' ')}>{st.label}</span>} />
          <Info label="Gender" value={a.gender ? a.gender[0].toUpperCase() + a.gender.slice(1) : '—'} />
          <Info label="Breed" value={a.breed || '—'} />
          <Info label="Date of birth" value={a.birth_date ? `${fmtDate(a.birth_date)} (${ageLabel(a.birth_date)})` : '—'} />
          <Info label="Acquired on" value={fmtDate(a.acquired_on)} />
          <Info label="Purchase price" value={a.purchase_price ? rs(a.purchase_price) : '—'} />
          <Info label="Spent on it" value={<span className="text-rose-600 font-semibold">{rs(stat.spent)}</span>} />
          <div className="col-span-2"><Info label="Produced (all time)" value={prodText(stat.prod) || '—'} /></div>
          {a.notes ? <div className="col-span-2"><Info label="Notes" value={a.notes} /></div> : null}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mt-6">
        <div>
          <div className="text-xs uppercase tracking-widest font-bold text-ink-400 mb-2">Recent production</div>
          {recent.length === 0 ? <div className="text-sm text-ink-400">Nothing recorded.</div> : recent.map((p) => (
            <div key={p.id} className="flex justify-between text-sm py-1.5 border-b border-slate-50">
              <span className="text-ink-600">{fmtDate(p.produced_on)}{p.shift ? ` · ${p.shift}` : ''}</span>
              <span className="font-semibold text-ink-800">{qtyFmt(p.quantity)} {p.unit} {p.product}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs uppercase tracking-widest font-bold text-ink-400 mb-2">Expenses</div>
          {expenses.length === 0 ? <div className="text-sm text-ink-400">No expenses linked.</div> : expenses.slice(0, 15).map((e) => (
            <div key={e.id} className="flex justify-between gap-3 text-sm py-1.5 border-b border-slate-50">
              <span className="text-ink-600 truncate">{fmtDate(e.spent_on)} · {e.category}{e.description ? ` · ${e.description}` : ''}</span>
              <span className="font-semibold text-rose-600 whitespace-nowrap">{rs(e.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-widest text-ink-400">{label}</div>
      <div className="text-ink-800">{value}</div>
    </div>
  );
}

// Animal types (Buffalo, Cow, Goat, …) — the same list as the app's Livestock types.
function LivestockTypesDialog({ onClose }) {
  const { livestock, livestockCategories, saveFarmRow, deleteFarmRow } = useFarm();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // { id, name }
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { window.alert(e.message); } finally { setBusy(false); }
  };
  const add = () => run(async () => {
    const clean = name.trim();
    if (!clean) return;
    const next = livestockCategories.reduce((m, c) => Math.max(m, Number(c.sort_order) || 0), 0) + 1;
    await saveFarmRow('livestockCategories', { name: clean, color: '#5BA82F', sort_order: next });
    setName('');
  });
  const rename = () => run(async () => {
    if (!editing?.name.trim()) return;
    await saveFarmRow('livestockCategories', { id: editing.id, name: editing.name.trim() });
    setEditing(null);
  });
  const remove = (c) => {
    const n = livestock.filter((a) => a.category_id === c.id).length;
    if (!window.confirm(`Delete type "${c.name}"?${n ? `\n\n${n} animal(s) of this type will show "No type".` : ''}`)) return;
    run(() => deleteFarmRow('livestockCategories', c.id));
  };

  return (
    <Modal title="Animal types" onClose={onClose}>
      <div className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="New type, e.g. Camel" className={inputCls} />
        <button onClick={add} disabled={busy} className="px-4 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700 disabled:opacity-50">Add</button>
      </div>
      {livestockCategories.length === 0 && <div className="text-sm text-ink-400">No types yet.</div>}
      {livestockCategories.map((c) => (
        <div key={c.id} className="flex items-center gap-2 py-2 border-b border-slate-50">
          {editing?.id === c.id ? (
            <>
              <input autoFocus value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && rename()} className={inputCls} />
              <button onClick={rename} disabled={busy} className="text-sm font-semibold text-bf-600 px-2">Save</button>
            </>
          ) : (
            <>
              <span className="flex-1 text-ink-800">{c.name}</span>
              <span className="text-xs text-ink-400">{livestock.filter((a) => a.category_id === c.id).length} animal(s)</span>
              <button onClick={() => setEditing({ id: c.id, name: c.name })} className="text-slate-400 hover:text-bf-600 p-1"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => remove(c)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
            </>
          )}
        </div>
      ))}
    </Modal>
  );
}
