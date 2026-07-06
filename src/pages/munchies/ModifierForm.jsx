import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileCheck2, GripVertical, Trash2, Plus } from 'lucide-react';
import { Card, PrimaryBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';

export default function ModifierForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { modifiers, saveModifier, deleteModifier } = useMunchies();

  const existing = modifiers.find((m) => m.id === id);
  const [name, setName] = useState(existing?.name || '');
  const [options, setOptions] = useState(existing?.options?.length ? existing.options : [{ name: '', price: 0 }]);

  const setOpt = (i, patch) => setOptions((os) => os.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  const addOpt = () => setOptions((os) => [...os, { name: '', price: 0 }]);
  const delOpt = (i) => setOptions((os) => os.filter((_, idx) => idx !== i));

  const onSave = async () => {
    if (!name.trim()) return;
    const clean = options.filter((o) => o.name.trim()).map((o) => ({ name: o.name.trim(), price: Number(o.price) || 0 }));
    try {
      await saveModifier({ id: existing?.id, name: name.trim(), options: clean });
      navigate('/munchies/items/modifiers');
    } catch (e) { window.alert(e?.message || 'Could not save the modifier.'); }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this modifier?')) return;
    try { await deleteModifier(existing.id); navigate('/munchies/items/modifiers'); }
    catch (e) { window.alert(e?.message || 'Could not delete the modifier.'); }
  };

  return (
    <div className="max-w-[720px] mx-auto pb-24">
      <Card className="p-6 sm:p-10">
        <div className="flex justify-center mb-8">
          <span className="w-20 h-20 rounded-full bg-mun-500 text-white flex items-center justify-center">
            <FileCheck2 className="w-9 h-9" />
          </span>
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Modifier name" className={[underline, 'text-2xl mb-8'].join(' ')} />

        <div className="space-y-6">
          {options.map((o, i) => (
            <div key={i} className="flex items-end gap-4">
              <GripVertical className="w-5 h-5 text-slate-300 mb-2 shrink-0" />
              <div className="flex-1">
                <div className="text-xs text-mun-600 mb-1">Option name</div>
                <input value={o.name} onChange={(e) => setOpt(i, { name: e.target.value })} className={underline} />
              </div>
              <div className="w-32">
                <div className="text-xs text-ink-400 mb-1">Price</div>
                <input value={o.price} onChange={(e) => setOpt(i, { price: e.target.value })} placeholder="Rs0.00" className={underline} inputMode="numeric" />
              </div>
              <button onClick={() => delOpt(i)} className="text-slate-400 hover:text-rose-500 mb-1.5 shrink-0">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button onClick={addOpt} className="flex items-center gap-2 text-mun-600 font-bold text-sm uppercase tracking-wide mt-8">
          <Plus className="w-5 h-5 rounded-full border-2 border-mun-600 p-0.5" /> Add option
        </button>
      </Card>

      <div className="flex items-center justify-between mt-4 px-2">
        {existing ? (
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        ) : <span />}
        <div className="flex gap-3">
          <GhostBtn onClick={() => navigate('/munchies/items/modifiers')}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onSave}>Save</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
