import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Card, Field, Radio, PrimaryBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';

export default function DiscountForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { discounts, saveDiscount, deleteDiscount } = useMunchies();

  const existing = discounts.find((d) => d.id === id);
  const [name, setName] = useState(existing?.name || '');
  const [type, setType] = useState(existing?.type || 'percent');
  const [variable, setVariable] = useState(existing ? existing.value == null : false);
  const [value, setValue] = useState(existing?.value ?? '');

  const onSave = async () => {
    if (!name.trim()) return;
    try {
      await saveDiscount({ id: existing?.id, name: name.trim(), type, value: variable ? null : Number(value) || 0 });
      navigate('/munchies/items/discounts');
    } catch (e) { window.alert(e?.message || 'Could not save the discount.'); }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this discount?')) return;
    try { await deleteDiscount(existing.id); navigate('/munchies/items/discounts'); }
    catch (e) { window.alert(e?.message || 'Could not delete the discount.'); }
  };

  return (
    <div className="max-w-[720px] mx-auto pb-24">
      <Card className="p-6 sm:p-8">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={[underline, 'text-xl mb-8'].join(' ')} />

        <div className="flex items-center gap-10 mb-6">
          <span className="text-sm text-ink-500">Type</span>
          <Radio checked={type === 'percent'} onChange={() => setType('percent')} label="Percentage" />
          <Radio checked={type === 'amount'} onChange={() => setType('amount')} label="Amount" />
        </div>

        <div className="max-w-[220px]">
          <Field label="Value">
            <input
              value={variable ? '' : value}
              onChange={(e) => setValue(e.target.value)}
              disabled={variable}
              placeholder={type === 'percent' ? '0%' : 'Rs0.00'}
              className={[underline, variable && 'opacity-40'].join(' ')}
              inputMode="numeric"
            />
          </Field>
        </div>

        <label className="flex items-center gap-3 mt-6 cursor-pointer" onClick={() => setVariable((v) => !v)}>
          <span className={['w-5 h-5 rounded flex items-center justify-center border-2', variable ? 'bg-mun-500 border-mun-500' : 'border-slate-300'].join(' ')}>
            {variable && <span className="text-white text-xs">✓</span>}
          </span>
          <span className="text-sm text-ink-700">Value is entered at the time of sale</span>
        </label>
      </Card>

      <div className="flex items-center justify-between mt-4 px-2">
        {existing ? (
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        ) : <span />}
        <div className="flex gap-3">
          <GhostBtn onClick={() => navigate('/munchies/items/discounts')}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onSave}>Save</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
