import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Percent, Trash2 } from 'lucide-react';
import { Card, PrimaryBtn, CheckBox } from './catalogUi.jsx';
import { rs } from '../../data/munchiesData.js';
import { useMunchies } from '../../store/MunchiesStore.jsx';

export function discountValueLabel(d) {
  if (d.value == null) return 'Variable';
  return d.type === 'percent' ? `${d.value}%` : rs(d.value);
}

export default function ItemDiscounts() {
  const navigate = useNavigate();
  const { discounts, deleteDiscounts } = useMunchies();
  const [selected, setSelected] = useState([]);

  const allChecked = discounts.length > 0 && discounts.every((d) => selected.includes(d.id));
  const toggleAll = () => setSelected(allChecked ? [] : discounts.map((d) => d.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="max-w-[1000px] mx-auto">
      <Card>
        <div className="flex items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/munchies/items/discounts/new')}>+ Add discount</PrimaryBtn>
          {selected.length > 0 && (
            <button onClick={() => { deleteDiscounts(selected); setSelected([]); }} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
              <Trash2 className="w-4 h-4" /> Delete ({selected.length})
            </button>
          )}
        </div>

        <table className="w-full text-sm border-t border-slate-100">
          <thead>
            <tr className="text-ink-500">
              <th className="px-5 py-3 w-10"><CheckBox checked={allChecked} onChange={toggleAll} /></th>
              <th className="text-left font-medium px-2 py-3">Name</th>
              <th className="text-right font-medium px-5 py-3">Value</th>
            </tr>
          </thead>
          <tbody>
            {discounts.map((d) => (
              <tr key={d.id} onClick={() => navigate(`/munchies/items/discounts/${d.id}`)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}><CheckBox checked={selected.includes(d.id)} onChange={() => toggleOne(d.id)} /></td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-11 h-11 rounded-full bg-mun-500 text-white flex items-center justify-center shrink-0">
                      <Percent className="w-5 h-5" />
                    </span>
                    <span className="text-ink-800">{d.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-right font-semibold text-ink-800">{discountValueLabel(d)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
