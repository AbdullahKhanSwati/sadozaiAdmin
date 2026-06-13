import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useShots } from '../../store/ShotsStore.jsx';

/**
 * Manage the list of table types (Pool, Snooker, Foosball, …) stored in the DB.
 * These drive the Type dropdown when adding/editing a table.
 */
export default function TableTypesDialog({ open, onClose }) {
  const { tableTypes, tables, addTableType, updateTableType, deleteTableType } = useShots();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const add = async () => {
    setError('');
    const name = newName.trim();
    if (!name) return;
    if (tableTypes.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      return setError(`"${name}" already exists.`);
    }
    try { await addTableType(name); setNewName(''); }
    catch (e) { setError(e?.message || 'Could not add type.'); }
  };

  const saveEdit = async (t) => {
    const name = editName.trim();
    if (!name) return;
    try { await updateTableType(t.id, name); setEditingId(null); }
    catch (e) { setError(e?.message || 'Could not rename type.'); }
  };

  const remove = (t) => {
    const used = tables.filter((x) => x.type === t.name).length;
    const msg = used > 0
      ? `${used} table(s) currently use the "${t.name}" type. Delete this type anyway?`
      : `Delete the "${t.name}" type?`;
    if (confirm(msg)) deleteTableType(t.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Tables</div>
            <h3 className="text-xl font-extrabold">Manage table types</h3>
            <p className="text-xs text-ink-500 mt-0.5">e.g. Pool, Snooker, Foosball.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-2">
          {tableTypes.length === 0 && (
            <p className="text-sm text-ink-500">No types yet. Add your first one below.</p>
          )}
          {tableTypes.map((t) => {
            const used = tables.filter((x) => x.type === t.name).length;
            const isEditing = editingId === t.id;
            return (
              <div key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5">
                {isEditing ? (
                  <>
                    <input
                      className="input flex-1"
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(t)}
                    />
                    <button onClick={() => saveEdit(t)} className="btn-primary px-2.5 py-1.5 text-xs"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost px-2.5 py-1.5 text-xs"><X className="w-3.5 h-3.5" /></button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{t.name}</div>
                      <div className="text-[11px] text-ink-400">{used} table{used === 1 ? '' : 's'}</div>
                    </div>
                    <button onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(t)} className="btn-danger px-2.5 py-1.5 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            className="input flex-1"
            placeholder="New type (e.g. Foosball)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Add</button>
        </div>

        {error && <div className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn-ghost">Done</button>
        </div>
      </div>
    </div>
  );
}
