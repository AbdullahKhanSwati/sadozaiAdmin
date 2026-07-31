import { useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMunchies } from '../../store/MunchiesStore.jsx';

/**
 * Manage the Munchies expense categories stored in `expense_categories`.
 * These drive the Category dropdown on this page AND on the app's Add-expense
 * form. Renaming a category also renames it on existing expenses; deleting one
 * leaves historic expenses untouched (they keep their category text).
 */
export default function MunchiesExpenseCategoriesDialog({ open, onClose }) {
  const {
    expenses, expenseCategories,
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
  } = useMunchies();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const usedBy = (name) => expenses.filter((e) => (e.category || '') === name).length;

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try { await fn(); }
    catch (e) { setError(e?.message || 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  const add = () => run(async () => {
    const name = newName.trim();
    if (!name) return;
    await addExpenseCategory(name);
    setNewName('');
  });

  const saveEdit = (c) => run(async () => {
    const name = editName.trim();
    if (!name) return;
    await updateExpenseCategory(c.id, name);
    setEditingId(null);
  });

  const remove = (c) => {
    const used = usedBy(c.name);
    const msg = used > 0
      ? `${used} expense(s) use "${c.name}". Delete the category anyway? (Those expenses keep their category text.)`
      : `Delete the "${c.name}" category?`;
    if (!window.confirm(msg)) return;
    run(() => deleteExpenseCategory(c.id));
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Expenses</div>
            <h3 className="text-xl font-extrabold text-ink-800">Manage categories</h3>
            <p className="text-xs text-ink-500 mt-0.5">Used here and on the Munchies app's Add-expense screen.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-ink-400 hover:text-ink-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          {expenseCategories.length === 0 && (
            <p className="text-sm text-ink-500">No categories yet. Add your first one below.</p>
          )}
          {expenseCategories.map((c) => {
            const used = usedBy(c.name);
            const isEditing = editingId === c.id;
            return (
              <div key={c.id} className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5">
                {isEditing ? (
                  <>
                    <input
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(c)}
                    />
                    <button onClick={() => saveEdit(c)} disabled={busy} className="p-2 rounded-lg bg-mun-600 text-white hover:bg-mun-700 disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-2 rounded-lg border border-slate-200 text-ink-500 hover:bg-slate-50">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-ink-800 truncate">{c.name}</div>
                      <div className="text-[11px] text-ink-400">{used} expense{used === 1 ? '' : 's'}</div>
                    </div>
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className="p-2 rounded-lg text-slate-400 hover:text-mun-600 hover:bg-slate-50">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(c)} disabled={busy} className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="New category (e.g. Marketing)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button onClick={add} disabled={busy || !newName.trim()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-mun-600 text-white text-sm font-semibold hover:bg-mun-700 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {error && <div className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-ink-500 hover:text-ink-700">Done</button>
        </div>
      </div>
    </div>
  );
}
