import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useShots } from '../../store/ShotsStore.jsx';

/**
 * Manage the list of expense categories stored in the DB. These drive the
 * Category dropdown + filters on the Expenses page.
 */
export default function ExpenseCategoriesDialog({ open, onClose }) {
  const { expenseCategories, finance, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } = useShots();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;
  const expenses = finance.filter((f) => f.type === 'Out');

  const add = async () => {
    setError('');
    const name = newName.trim();
    if (!name) return;
    if (expenseCategories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return setError(`"${name}" already exists.`);
    }
    try { await addExpenseCategory(name); setNewName(''); }
    catch (e) { setError(e?.message || 'Could not add category.'); }
  };

  const saveEdit = async (c) => {
    const name = editName.trim();
    if (!name) return;
    try { await updateExpenseCategory(c.id, name); setEditingId(null); }
    catch (e) { setError(e?.message || 'Could not rename category.'); }
  };

  const remove = (c) => {
    const used = expenses.filter((e) => e.category === c.name).length;
    const msg = used > 0
      ? `${used} expense(s) use the "${c.name}" category. Delete it anyway? (Those expenses keep their category text.)`
      : `Delete the "${c.name}" category?`;
    if (confirm(msg)) deleteExpenseCategory(c.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Expenses</div>
            <h3 className="text-xl font-extrabold">Manage categories</h3>
            <p className="text-xs text-ink-500 mt-0.5">e.g. Repair, Utilities, Salaries.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-2">
          {expenseCategories.length === 0 && (
            <p className="text-sm text-ink-500">No categories yet. Add your first one below.</p>
          )}
          {expenseCategories.map((c) => {
            const used = expenses.filter((e) => e.category === c.name).length;
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5">
                {isEditing ? (
                  <>
                    <input
                      className="input flex-1"
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(c)}
                    />
                    <button onClick={() => saveEdit(c)} className="btn-primary px-2.5 py-1.5 text-xs"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditingId(null)} className="btn-ghost px-2.5 py-1.5 text-xs"><X className="w-3.5 h-3.5" /></button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{c.name}</div>
                      <div className="text-[11px] text-ink-400">{used} expense{used === 1 ? '' : 's'}</div>
                    </div>
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className="btn-ghost px-2.5 py-1.5 text-xs"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(c)} className="btn-danger px-2.5 py-1.5 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            className="input flex-1"
            placeholder="New category (e.g. Marketing)"
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
