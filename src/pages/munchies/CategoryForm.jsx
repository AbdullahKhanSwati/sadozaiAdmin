import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { Card, ColorPicker, TextBtn, underline } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { EditGate } from './formGate.jsx';

export default function CategoryForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { categories, saveCategory, deleteCategory, ready } = useMunchies();

  const existing = categories.find((c) => c.id === id);
  const [name, setName] = useState(existing?.name || '');
  const [color, setColor] = useState(existing?.color || '#BDBDBD');

  // Hydrate when the record loads (deep-link / hard refresh onto this page).
  useEffect(() => {
    if (existing) { setName(existing.name || ''); setColor(existing.color || '#BDBDBD'); }
  }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gate = <EditGate id={id} existing={existing} ready={ready} />;
  if (id && !existing) return gate;

  const onSave = async () => {
    if (!name.trim()) return;
    try {
      await saveCategory({ id: existing?.id, name: name.trim(), color });
      navigate('/munchies/items/categories');
    } catch (e) { window.alert(e?.message || 'Could not save the category.'); }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this category?')) return;
    try { await deleteCategory(existing.id); navigate('/munchies/items/categories'); }
    catch (e) { window.alert(e?.message || 'Could not delete the category.'); }
  };

  return (
    <div className="max-w-[900px] mx-auto">
      <Card className="p-6 sm:p-8">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={[underline, 'text-xl mb-8'].join(' ')} />
        <ColorPicker value={color} onChange={setColor} />
      </Card>

      <div className="flex items-center justify-end gap-6 mt-4 px-2">
        {existing && (
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600 mr-auto">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
        <TextBtn onClick={() => navigate('/munchies/items/categories')}>Cancel</TextBtn>
        <TextBtn tone="mun" onClick={onSave}>Save</TextBtn>
      </div>
    </div>
  );
}
