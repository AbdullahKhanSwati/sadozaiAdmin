import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Image as ImageIcon, Trash2, Loader2 } from 'lucide-react';
import {
  Card, Field, Radio, Toggle, ColorPicker, ShapePicker, PrimaryBtn, GhostBtn, underline,
} from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { uploadItemImage } from '../../lib/supabaseMunchies.js';

export default function ItemForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { items, categories, modifiers, saveItem, deleteItem } = useMunchies();

  const existing = items.find((i) => i.id === id);
  const [form, setForm] = useState(() =>
    existing || {
      name: '', categoryId: '', description: '', availableForSale: true,
      soldBy: 'Each', price: '', cost: 0, sku: String(10001 + items.length),
      barcode: '', composite: false, trackStock: false, modifiers: [],
      color: '#BDBDBD', shape: 'square', image: '', variants: [],
    }
  );
  const [rep, setRep] = useState(existing?.image ? 'image' : 'color');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const toggleMod = (mid) =>
    set({ modifiers: form.modifiers.includes(mid) ? form.modifiers.filter((x) => x !== mid) : [...form.modifiers, mid] });

  const variants = form.variants || [];
  const addVariant = () => set({ variants: [...variants, { name: '', price: '' }] });
  const setVariant = (i, patch) => set({ variants: variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });
  const delVariant = (i) => set({ variants: variants.filter((_, idx) => idx !== i) });

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadItemImage(file);
      set({ image: url });
    } catch (err) {
      window.alert(err?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const cleanVariants = variants.filter((v) => v.name.trim()).map((v) => ({ name: v.name.trim(), price: Number(v.price) || 0 }));
    try {
      await saveItem({
        ...form, price: Number(form.price) || 0, cost: Number(form.cost) || 0,
        image: rep === 'image' ? form.image : (form.image || ''), variants: cleanVariants,
      });
      navigate('/munchies/items/list');
    } catch (e) {
      window.alert(e?.message || 'Could not save the item.');
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this item?')) return;
    try { await deleteItem(existing.id); navigate('/munchies/items/list'); }
    catch (e) { window.alert(e?.message || 'Could not delete the item.'); }
  };

  return (
    <div className="max-w-[900px] mx-auto pb-24">
      {/* Main details */}
      <Card className="p-6 sm:p-8 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
          <input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" className={[underline, 'text-2xl'].join(' ')} />
          <Field label="Category">
            <select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={underline}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-6">
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Description" rows={2} className="w-full border border-slate-200 rounded-md p-3 text-sm text-ink-700 placeholder:text-slate-400 focus:outline-none focus:border-mun-400" />
        </div>

        <label className="flex items-center gap-3 mt-6 cursor-pointer" onClick={() => set({ availableForSale: !form.availableForSale })}>
          <span className={['w-6 h-6 rounded flex items-center justify-center border-2', form.availableForSale ? 'bg-mun-500 border-mun-500' : 'border-slate-300'].join(' ')}>
            {form.availableForSale && <span className="text-white text-sm">✓</span>}
          </span>
          <span className="text-sm text-ink-700">The item is available for sale</span>
        </label>

        <div className="flex items-center gap-8 mt-6">
          <span className="text-sm text-ink-500">Sold by</span>
          <Radio checked={form.soldBy === 'Each'} onChange={() => set({ soldBy: 'Each' })} label="Each" />
          <Radio checked={form.soldBy === 'Weight/Volume'} onChange={() => set({ soldBy: 'Weight/Volume' })} label="Weight/Volume" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6 mt-8">
          <Field label="Price" hint="To indicate the price upon sale, leave the field blank">
            <input value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="Rs0.00" className={underline} inputMode="numeric" />
          </Field>
          <Field label="Cost">
            <input value={form.cost} onChange={(e) => set({ cost: e.target.value })} placeholder="Rs0.00" className={underline} inputMode="numeric" />
          </Field>
          <Field label="SKU" hint="Unique identifier assigned to an item">
            <input value={form.sku} onChange={(e) => set({ sku: e.target.value })} className={underline} />
          </Field>
          <Field label="Barcode">
            <input value={form.barcode} onChange={(e) => set({ barcode: e.target.value })} className={underline} />
          </Field>
        </div>
      </Card>

      {/* Inventory */}
      <Card className="p-6 sm:p-8 mb-4">
        <h3 className="text-xl font-semibold text-ink-800 mb-5">Inventory</h3>
        <Row label="Composite item" info on={form.composite} onChange={(v) => set({ composite: v })} />
        <Row label="Track stock" on={form.trackStock} onChange={(v) => set({ trackStock: v })} />
      </Card>

      {/* Variants */}
      <Card className="p-6 sm:p-8 mb-4">
        <h3 className="text-xl font-semibold text-ink-800 mb-3">Variants</h3>
        <p className="text-sm text-ink-500 mb-4">Use variants if an item has different sizes, colors or other options</p>
        {variants.length > 0 && (
          <div className="space-y-4 mb-4">
            {variants.map((v, i) => (
              <div key={i} className="flex items-end gap-4">
                <div className="flex-1">
                  <div className="text-xs text-ink-400 mb-1">Variant name</div>
                  <input value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} placeholder="e.g. Large" className={underline} />
                </div>
                <div className="w-32">
                  <div className="text-xs text-ink-400 mb-1">Price</div>
                  <input value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} placeholder="Rs0.00" className={underline} inputMode="numeric" />
                </div>
                <button onClick={() => delVariant(i)} className="text-slate-400 hover:text-rose-500 mb-1.5"><Trash2 className="w-5 h-5" /></button>
              </div>
            ))}
          </div>
        )}
        <button onClick={addVariant} className="flex items-center gap-2 text-mun-600 font-bold text-sm uppercase tracking-wide">
          <Plus className="w-5 h-5 rounded-full border-2 border-mun-600 p-0.5" /> Add variants
        </button>
      </Card>

      {/* Modifiers */}
      <Card className="p-6 sm:p-8 mb-4">
        <h3 className="text-xl font-semibold text-ink-800 mb-5">Modifiers</h3>
        {modifiers.length === 0 && <p className="text-sm text-ink-400">No modifiers yet.</p>}
        <div className="divide-y divide-slate-100">
          {modifiers.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-4">
              <span className="text-sm text-ink-700">{m.name}</span>
              <Toggle on={form.modifiers.includes(m.id)} onChange={() => toggleMod(m.id)} />
            </div>
          ))}
        </div>
      </Card>

      {/* Representation on POS */}
      <Card className="p-6 sm:p-8 mb-4">
        <h3 className="text-xl font-semibold text-ink-800 mb-5">Representation on POS</h3>
        <div className="flex items-center gap-10 mb-6">
          <Radio checked={rep === 'color'} onChange={() => setRep('color')} label="Color and shape" />
          <Radio checked={rep === 'image'} onChange={() => setRep('image')} label="Image" />
        </div>

        {rep === 'color' ? (
          <div className="flex flex-wrap items-start gap-10">
            <div className="space-y-4">
              <ColorPicker value={form.color} onChange={(c) => set({ color: c })} />
              <ShapePicker value={form.shape} onChange={(s) => set({ shape: s })} />
            </div>
            <div className="w-28 h-28 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-300 overflow-hidden">
              {form.image ? <img src={form.image} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8" />}
            </div>
          </div>
        ) : (
          <label className="w-40 h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-md flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer overflow-hidden relative">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-mun-500" />
            ) : form.image ? (
              <>
                <img src={form.image} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-1 right-1 bg-white/90 rounded px-1.5 py-0.5 text-[10px] text-ink-600">Change</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-8 h-8" />
                <span className="text-xs">Upload image</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onUpload} />
          </label>
        )}
      </Card>

      {/* Footer actions */}
      <div className="flex items-center gap-3">
        {existing && (
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
        <div className="flex-1" />
        <GhostBtn onClick={() => navigate('/munchies/items/list')}>Cancel</GhostBtn>
        <PrimaryBtn onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryBtn>
      </div>
    </div>
  );
}

function Row({ label, info, on, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="flex items-center gap-2 text-sm text-ink-700">
        {label}
        {info && <span className="w-4 h-4 rounded-full border border-slate-300 text-slate-400 text-[10px] flex items-center justify-center">i</span>}
      </span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}
