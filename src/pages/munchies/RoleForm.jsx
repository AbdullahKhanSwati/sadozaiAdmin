import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Users, Trash2 } from 'lucide-react';
import { Card, Field, Radio, PrimaryBtn, GhostBtn, underline } from './catalogUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';

const ROLE_COLORS = ['#FB8C00', '#8E24AA', '#1E88E5', '#00897B', '#E53935', '#43A047'];

export default function RoleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { roles, saveRole, deleteRole } = useMunchies();

  const existing = roles.find((r) => r.id === id);
  const [name, setName] = useState(existing?.name || '');
  const [access, setAccess] = useState(existing?.access || 'pos');
  const [color, setColor] = useState(existing?.color || ROLE_COLORS[0]);

  const onSave = async () => {
    if (!name.trim()) return;
    try {
      await saveRole({ id: existing?.id, name: name.trim(), access, color, system: existing?.system || false });
      navigate('/munchies/employees/access');
    } catch (e) { window.alert(e?.message || 'Could not save the role.'); }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this role?')) return;
    try { await deleteRole(existing.id); navigate('/munchies/employees/access'); }
    catch (e) { window.alert(e?.message || 'Could not delete the role.'); }
  };

  return (
    <div className="max-w-[760px] mx-auto pb-24">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <span className="w-14 h-14 rounded-full text-white flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
            <Users className="w-7 h-7" />
          </span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Role name" className={[underline, 'text-xl flex-1'].join(' ')} />
        </div>

        <Field label="Color">
          <div className="flex flex-wrap gap-3 mt-1">
            {ROLE_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: c }}>
                {color === c && <span className="text-sm">✓</span>}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-8">
          <div className="text-sm text-ink-500 mb-3">Access</div>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer" onClick={() => setAccess('both')}>
              <Radio checked={access === 'both'} onChange={() => setAccess('both')} label="" />
              <div>
                <div className="text-sm font-medium text-ink-800">Back office and POS</div>
                <div className="text-xs text-ink-400">Admin — full access to the dashboard and the Munchies app.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer" onClick={() => setAccess('pos')}>
              <Radio checked={access === 'pos'} onChange={() => setAccess('pos')} label="" />
              <div>
                <div className="text-sm font-medium text-ink-800">POS</div>
                <div className="text-xs text-ink-400">Staff — can access the Munchies app only.</div>
              </div>
            </label>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between mt-4 px-2">
        {existing && !existing.system ? (
          <button onClick={onDelete} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        ) : <span />}
        <div className="flex gap-3">
          <GhostBtn onClick={() => navigate('/munchies/employees/access')}>Cancel</GhostBtn>
          <PrimaryBtn onClick={onSave}>Save</PrimaryBtn>
        </div>
      </div>
    </div>
  );
}
