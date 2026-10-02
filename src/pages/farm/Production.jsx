import { useMemo, useState } from 'react';
import { Plus, Download, Pencil, Trash2, Tags, Search } from 'lucide-react';
import { downloadCsv, csvDate } from '../../lib/csv.js';
import { useFarm } from '../../store/FarmStore.jsx';
import { DateRangePicker, defaultRange, inRange, rangeLabel, usePagination, TablePagination } from './bfUi.jsx';
import {
  today, fmtDate, exportDate, qtyFmt, SHIFTS, UNITS, inputCls, Label, Modal, StatTile,
} from './farmUi.jsx';

// Production — what the animals produced (milk, eggs, …) per day, the same
// records the app's Production screen keeps. Opens on month to date; totals
// per product and per animal follow the period and filters.
const EMPTY = { id: null, produced_on: today(), livestock_id: '', product: '', unit: '', quantity: '', shift: '', note: '' };

export default function Production() {
  const { production, productionTypes, livestock, saveFarmRow, deleteFarmRow, animalById, animalLabel } = useFarm();
  const [range, setRange] = useState(defaultRange);
  const [product, setProduct] = useState('');   // '' = all products
  const [animal, setAnimal] = useState('');     // '' = all animals
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const nameOf = (p) => animalLabel(animalById(p.livestock_id)) || p.livestock_name || p.item_name || 'General';

  const filtered = useMemo(() => production.filter((p) => {
    if (!inRange(p.produced_on, range)) return false;
    if (product && p.product !== product) return false;
    if (animal && p.livestock_id !== animal) return false;
    if (q) {
      const t = `${nameOf(p)} ${p.product} ${p.note || ''}`.toLowerCase();
      if (!t.includes(q.toLowerCase())) return false;
    }
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [production, range, product, animal, q, livestock]);
  const { pageItems, ...pager } = usePagination(filtered, 25);

  // Totals per product (with unit) and per animal for the period.
  const byProduct = useMemo(() => {
    const m = new Map();
    filtered.forEach((p) => {
      const k = `${p.product}|${p.unit}`;
      const r = m.get(k) || { product: p.product, unit: p.unit, qty: 0, days: new Set() };
      r.qty += Number(p.quantity) || 0;
      r.days.add(p.produced_on);
      m.set(k, r);
    });
    return [...m.values()].sort((a, b) => b.qty - a.qty);
  }, [filtered]);
  const byAnimal = useMemo(() => {
    const m = new Map();
    filtered.forEach((p) => {
      const key = p.livestock_id || `name:${nameOf(p)}`;
      const r = m.get(key) || { name: nameOf(p), totals: {} };
      const k = `${p.product}|${p.unit}`;
      r.totals[k] = (r.totals[k] || 0) + (Number(p.quantity) || 0);
      m.set(key, r);
    });
    return [...m.values()]
      .map((r) => ({ ...r, sum: Object.values(r.totals).reduce((s, v) => s + v, 0) }))
      .sort((a, b) => b.sum - a.sum);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, livestock]);
  const totalsText = (t) => Object.entries(t).map(([k, v]) => `${qtyFmt(v)} ${k.split('|')[1]} ${k.split('|')[0]}`).join(', ');

  const products = useMemo(() => {
    const names = new Set(productionTypes.map((t) => t.name));
    production.forEach((p) => p.product && names.add(p.product));
    return [...names];
  }, [productionTypes, production]);
  const unitFor = (name) => productionTypes.find((t) => t.name === name)?.unit || '';
  const activeAnimals = livestock.filter((a) => (a.status || 'active') === 'active');

  const openNew = () => {
    const first = product || productionTypes[0]?.name || '';
    setForm({ ...EMPTY, produced_on: today(), product: first, unit: unitFor(first) || 'Litre', livestock_id: animal || '' });
  };
  const openEdit = (p) => setForm({
    id: p.id, produced_on: p.produced_on || today(), livestock_id: p.livestock_id || '',
    product: p.product || '', unit: p.unit || '', quantity: String(p.quantity ?? ''), shift: p.shift || '', note: p.note || '',
  });

  const save = async () => {
    const qty = Number(form.quantity);
    if (!form.product) return window.alert('Pick what was produced.');
    if (!(qty > 0)) return window.alert('Enter a quantity greater than 0.');
    const a = form.livestock_id ? animalById(form.livestock_id) : null;
    setSaving(true);
    try {
      await saveFarmRow('production', {
        id: form.id || undefined,
        produced_on: form.produced_on || today(),
        livestock_id: a?.id || null,
        // Snapshot of the animal's name, so history stays readable if it is removed.
        livestock_name: a ? animalLabel(a) : null,
        item_name: a ? animalLabel(a) : '',
        product: form.product,
        unit: form.unit || unitFor(form.product) || '',
        quantity: qty,
        shift: form.shift || null,
        note: form.note.trim() || null,
      });
      setForm(null);
    } catch (e) {
      window.alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete ${qtyFmt(p.quantity)} ${p.unit} ${p.product} (${nameOf(p)}, ${fmtDate(p.produced_on)})?`)) return;
    try { await deleteFarmRow('production', p.id); } catch (e) { window.alert(e.message); }
  };

  const onExport = () => downloadCsv(`farm-production-${csvDate()}.csv`, [
    { label: 'Date', value: (p) => exportDate(p.produced_on) },
    { label: 'Shift', value: (p) => p.shift || 'Whole day' },
    { label: 'Animal', value: (p) => nameOf(p) },
    { label: 'Product', value: 'product' },
    { label: 'Quantity', value: (p) => Number(p.quantity) || 0 },
    { label: 'Unit', value: 'unit' },
    { label: 'Note', value: (p) => p.note || '' },
  ], filtered);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DateRangePicker range={range} onChange={setRange} />
        <select value={product} onChange={(e) => setProduct(e.target.value)} className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white">
          <option value="">All products</option>
          {products.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={animal} onChange={(e) => setAnimal(e.target.value)} className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white max-w-[220px]">
          <option value="">All animals</option>
          {livestock.map((a) => <option key={a.id} value={a.id}>{animalLabel(a)}{(a.status || 'active') !== 'active' ? ` (${a.status})` : ''}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {byProduct.length === 0 && <StatTile label={rangeLabel(range)} value="No production" />}
        {byProduct.slice(0, 3).map((r) => (
          <StatTile key={`${r.product}|${r.unit}`} label={`${r.product} · ${rangeLabel(range)}`} value={`${qtyFmt(r.qty)} ${r.unit}`} sub={`${r.days.size} day(s) · avg ${qtyFmt(r.qty / Math.max(1, r.days.size))} ${r.unit}/day`} tone="text-bf-700" />
        ))}
        <StatTile label="Records" value={filtered.length} sub={`${byAnimal.length} animal(s)`} />
      </div>

      <div className="grid xl:grid-cols-[1fr_320px] gap-4 items-start">
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="flex flex-wrap items-center gap-2 p-4 border-b border-slate-100">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search animal, product or note" className={`${inputCls} pl-9`} />
            </div>
            <button onClick={() => setTypesOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-600 hover:bg-slate-50">
              <Tags className="w-4 h-4" /> Products
            </button>
            <button onClick={onExport} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-600 hover:bg-slate-50">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={openNew} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700">
              <Plus className="w-4 h-4" /> Add production
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-500">
                  <th className="text-left font-medium px-4 py-3">Date</th>
                  <th className="text-left font-medium px-4 py-3">Animal</th>
                  <th className="text-left font-medium px-4 py-3">Product</th>
                  <th className="text-right font-medium px-4 py-3">Quantity</th>
                  <th className="text-left font-medium px-4 py-3">Note</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-400">No production recorded for this period.</td></tr>}
                {pageItems.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink-800">{fmtDate(p.produced_on)}</div>
                      <div className="text-xs text-ink-400">{p.shift || 'Whole day'}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-700">{nameOf(p)}</td>
                    <td className="px-4 py-3 text-ink-700">{p.product}</td>
                    <td className="px-4 py-3 text-right font-bold text-ink-800 whitespace-nowrap">{qtyFmt(p.quantity)} {p.unit}</td>
                    <td className="px-4 py-3 text-ink-500 truncate max-w-[220px]">{p.note || ''}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-bf-600 p-1"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(p)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination {...pager} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-100 text-[11px] uppercase tracking-widest font-bold text-ink-400">By animal · {rangeLabel(range)}</div>
          {byAnimal.length === 0 && <div className="px-4 py-6 text-sm text-ink-400">Nothing yet.</div>}
          {byAnimal.map((r) => (
            <div key={r.name} className="flex justify-between gap-3 px-4 py-2.5 border-b border-slate-50 text-sm">
              <span className="text-ink-700 truncate">{r.name}</span>
              <span className="font-semibold text-ink-800 text-right">{totalsText(r.totals)}</span>
            </div>
          ))}
        </div>
      </div>

      {form && (
        <Modal
          title={form.id ? 'Edit production' : 'Add production'}
          onClose={() => setForm(null)}
          footer={(
            <>
              <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold text-ink-500 hover:text-ink-700">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </>
          )}
        >
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><input type="date" max={today()} value={form.produced_on} onChange={(e) => setForm((f) => ({ ...f, produced_on: e.target.value }))} className={inputCls} /></div>
            <div>
              <Label>Shift</Label>
              <select value={form.shift} onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))} className={inputCls}>
                {SHIFTS.map((s) => <option key={s.label} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Label>Animal</Label>
              <select value={form.livestock_id} onChange={(e) => setForm((f) => ({ ...f, livestock_id: e.target.value }))} className={inputCls}>
                <option value="">General (no animal)</option>
                {(form.livestock_id && !activeAnimals.some((a) => a.id === form.livestock_id) ? [animalById(form.livestock_id), ...activeAnimals].filter(Boolean) : activeAnimals)
                  .map((a) => <option key={a.id} value={a.id}>{animalLabel(a)}</option>)}
              </select>
            </div>
            <div>
              <Label>Product</Label>
              <select value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value, unit: unitFor(e.target.value) || f.unit }))} className={inputCls}>
                {!products.length && <option value="">Add a product first</option>}
                {products.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <Label>Quantity {form.unit ? `(${form.unit})` : ''}</Label>
              <input inputMode="decimal" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0" className={inputCls} />
            </div>
            <div className="col-span-2"><Label>Note</Label><input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Optional" className={inputCls} /></div>
          </div>
        </Modal>
      )}

      {typesOpen && <ProductionTypesDialog onClose={() => setTypesOpen(false)} />}
    </div>
  );
}

// What can be produced and its unit (Milk · Litre, Eggs · Pieces) — the same
// list as the app's Production types. Old records keep their own product
// text, so renaming a type never rewrites history.
function ProductionTypesDialog({ onClose }) {
  const { productionTypes, saveFarmRow, deleteFarmRow } = useFarm();
  const [name, setName] = useState('');
  const [unit, setUnit] = useState(UNITS[0]);
  const [busy, setBusy] = useState(false);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { window.alert(e.message); } finally { setBusy(false); }
  };
  const add = () => run(async () => {
    const clean = name.trim();
    if (!clean) return;
    const next = productionTypes.reduce((m, t) => Math.max(m, Number(t.sort_order) || 0), 0) + 1;
    await saveFarmRow('productionTypes', { name: clean, unit: unit.trim() || 'Litre', sort_order: next });
    setName('');
  });
  const remove = (t) => {
    if (!window.confirm(`Remove "${t.name}" from the list? Records already saved keep it.`)) return;
    run(() => deleteFarmRow('productionTypes', t.id));
  };

  return (
    <Modal title="Products" onClose={onClose}>
      <div className="grid grid-cols-[1fr_120px_auto] gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Milk" className={inputCls} />
        <input list="farm-units" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" className={inputCls} />
        <datalist id="farm-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        <button onClick={add} disabled={busy} className="px-4 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700 disabled:opacity-50">Add</button>
      </div>
      {productionTypes.length === 0 && <div className="text-sm text-ink-400">No products yet.</div>}
      {productionTypes.map((t) => (
        <div key={t.id} className="flex items-center gap-2 py-2 border-b border-slate-50">
          <span className="flex-1 text-ink-800">{t.name}</span>
          <span className="text-xs text-ink-400">{t.unit}</span>
          <button onClick={() => remove(t)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
    </Modal>
  );
}
