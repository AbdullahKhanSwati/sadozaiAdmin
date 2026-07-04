import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileCheck2, GripVertical, Trash2 } from 'lucide-react';
import { Card, PrimaryBtn, CheckBox } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';

export default function Modifiers() {
  const navigate = useNavigate();
  const { modifiers, deleteModifiers } = useMunchies();
  const [selected, setSelected] = useState([]);

  const allChecked = modifiers.length > 0 && modifiers.every((m) => selected.includes(m.id));
  const toggleAll = () => setSelected(allChecked ? [] : modifiers.map((m) => m.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="max-w-[1000px] mx-auto">
      <Card>
        <div className="flex items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/munchies/items/modifiers/new')}>+ Add modifier</PrimaryBtn>
          {selected.length > 0 && (
            <button onClick={() => { deleteModifiers(selected); setSelected([]); }} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
              <Trash2 className="w-4 h-4" /> Delete ({selected.length})
            </button>
          )}
        </div>

        <table className="w-full text-sm border-t border-slate-100">
          <thead>
            <tr className="text-ink-500">
              <th className="px-5 py-3 w-10"><CheckBox checked={allChecked} onChange={toggleAll} /></th>
              <th className="text-left font-medium px-2 py-3">Modifier</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {modifiers.map((m) => (
              <tr key={m.id} onClick={() => navigate(`/munchies/items/modifiers/${m.id}`)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}><CheckBox checked={selected.includes(m.id)} onChange={() => toggleOne(m.id)} /></td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-11 h-11 rounded-full bg-mun-500 text-white flex items-center justify-center shrink-0">
                      <FileCheck2 className="w-5 h-5" />
                    </span>
                    <div>
                      <div className="font-bold text-ink-800">{m.name}</div>
                      <div className="text-ink-400 text-xs mt-0.5 truncate max-w-[520px]">{m.options.map((o) => o.name).join(', ')}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-300"><GripVertical className="w-5 h-5" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
