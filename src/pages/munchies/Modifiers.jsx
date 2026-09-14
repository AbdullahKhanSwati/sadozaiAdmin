import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileCheck2, GripVertical, Trash2 } from 'lucide-react';
import { Card, PrimaryBtn, CheckBox } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';

// The order shown here IS the order the app shows modifiers in (on the item
// screen, in "Show all modifiers" and on the Modifiers list). Drag a row by its
// handle — or use the arrows on a touch screen — and the order is saved.
export default function Modifiers() {
  const navigate = useNavigate();
  const { modifiers, deleteModifiers, reorderModifiers } = useMunchies();
  const [selected, setSelected] = useState([]);
  const [list, setList] = useState(modifiers);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef(null);

  // Follow store changes (add/delete/realtime) unless a drag is in progress.
  useEffect(() => { if (!dragId) setList(modifiers); }, [modifiers, dragId]);

  const allChecked = list.length > 0 && list.every((m) => selected.includes(m.id));
  const toggleAll = () => setSelected(allChecked ? [] : list.map((m) => m.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const flash = (msg) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2500);
  };

  const persist = async (next) => {
    setList(next);
    setSaving(true);
    try {
      await reorderModifiers(next.map((m) => m.id));
      flash('Order saved — the app shows modifiers in this order.');
    } catch (e) {
      window.alert(e?.message || 'Could not save the new order.');
    } finally {
      setSaving(false);
    }
  };

  const moveTo = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || toIdx >= list.length) return;
    const next = [...list];
    const [row] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, row);
    persist(next);
  };
  const moveBy = (id, dir) => {
    const i = list.findIndex((m) => m.id === id);
    moveTo(i, i + dir);
  };

  // ---- HTML5 drag-and-drop ---------------------------------------------------
  const onDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', id); } catch { /* older browsers */ }
  };
  const onDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== overId) setOverId(id);
  };
  const onDrop = (e, id) => {
    e.preventDefault();
    const from = list.findIndex((m) => m.id === dragId);
    const to = list.findIndex((m) => m.id === id);
    setDragId(null); setOverId(null);
    if (from >= 0 && to >= 0) moveTo(from, to);
  };
  const onDragEnd = () => { setDragId(null); setOverId(null); };

  return (
    <div className="max-w-[1000px] mx-auto">
      <Card>
        <div className="flex flex-wrap items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/munchies/items/modifiers/new')}>+ Add modifier</PrimaryBtn>
          {selected.length > 0 && (
            <button onClick={async () => { if (!window.confirm(`Delete ${selected.length} modifier(s)?`)) return; try { await deleteModifiers(selected); setSelected([]); } catch (e) { window.alert(e?.message || 'Delete failed.'); } }} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
              <Trash2 className="w-4 h-4" /> Delete ({selected.length})
            </button>
          )}
          <div className="flex-1" />
          <span className={['text-xs font-semibold', notice ? 'text-mun-700' : 'text-ink-400'].join(' ')}>
            {saving ? 'Saving order…' : notice || 'Drag the handle (or use the arrows) to set the order shown in the app.'}
          </span>
        </div>

        <table className="w-full text-sm border-t border-slate-100">
          <thead>
            <tr className="text-ink-500">
              <th className="px-5 py-3 w-10"><CheckBox checked={allChecked} onChange={toggleAll} /></th>
              <th className="text-left font-medium px-2 py-3">Modifier</th>
              <th className="w-24 text-right font-medium px-3 py-3">Order</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {list.map((m, i) => {
              const dragging = dragId === m.id;
              const over = overId === m.id && dragId && dragId !== m.id;
              return (
                <tr
                  key={m.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, m.id)}
                  onDragOver={(e) => onDragOver(e, m.id)}
                  onDrop={(e) => onDrop(e, m.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => navigate(`/munchies/items/modifiers/${m.id}`)}
                  className={[
                    'border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer transition-colors',
                    dragging ? 'opacity-40' : '',
                    over ? 'bg-mun-50 border-t-2 border-t-mun-500' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}><CheckBox checked={selected.includes(m.id)} onChange={() => toggleOne(m.id)} /></td>
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-4">
                      <span className="w-11 h-11 rounded-full bg-mun-500 text-white flex items-center justify-center shrink-0">
                        <FileCheck2 className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-ink-800">{m.name}</div>
                        <div className="text-ink-400 text-xs mt-0.5 truncate max-w-[520px]">{(m.options || []).map((o) => o.name).join(', ')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center gap-1 text-ink-400">
                      <span className="text-xs font-semibold text-ink-500 mr-1">{i + 1}</span>
                      <button
                        type="button"
                        onClick={() => moveBy(m.id, -1)}
                        disabled={i === 0 || saving}
                        className="p-1 rounded hover:bg-slate-100 hover:text-mun-600 disabled:opacity-25 disabled:hover:bg-transparent"
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBy(m.id, 1)}
                        disabled={i === list.length - 1 || saving}
                        className="p-1 rounded hover:bg-slate-100 hover:text-mun-600 disabled:opacity-25 disabled:hover:bg-transparent"
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-300 cursor-grab active:cursor-grabbing" onClick={(e) => e.stopPropagation()} title="Drag to reorder">
                    <GripVertical className="w-5 h-5" />
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-10 text-center text-ink-400">No modifiers yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
