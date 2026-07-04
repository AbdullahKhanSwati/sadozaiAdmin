import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Card, PrimaryBtn, CheckBox } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';

export default function Categories() {
  const navigate = useNavigate();
  const { categories, itemCount, deleteCategories } = useMunchies();
  const [selected, setSelected] = useState([]);

  const allChecked = categories.length > 0 && categories.every((c) => selected.includes(c.id));
  const toggleAll = () => setSelected(allChecked ? [] : categories.map((c) => c.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // Prefer live item counts; fall back to the seeded count for empty categories.
  const count = (c) => itemCount(c.id) || c.count || 0;

  return (
    <div className="max-w-[1000px] mx-auto">
      <Card>
        <div className="flex items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/munchies/items/categories/new')}>+ Add category</PrimaryBtn>
          {selected.length > 0 && (
            <button onClick={() => { deleteCategories(selected); setSelected([]); }} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
              <Trash2 className="w-4 h-4" /> Delete ({selected.length})
            </button>
          )}
        </div>

        <table className="w-full text-sm border-t border-slate-100">
          <thead>
            <tr className="text-ink-500">
              <th className="px-5 py-3 w-10"><CheckBox checked={allChecked} onChange={toggleAll} /></th>
              <th className="text-left font-medium px-2 py-3">Name</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} onClick={() => navigate(`/munchies/items/categories/${c.id}`)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}><CheckBox checked={selected.includes(c.id)} onChange={() => toggleOne(c.id)} /></td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-11 h-11 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <div>
                      <div className="text-ink-800">{c.name}</div>
                      <div className="text-ink-400 text-xs mt-0.5">{count(c)} items</div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
