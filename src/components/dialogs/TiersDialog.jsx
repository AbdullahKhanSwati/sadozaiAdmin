import { useEffect, useState } from 'react';
import {
  Award, Check, Crown, Diamond, Pencil, Plus, Save, Shield, Sparkles, Star, Trash2, X,
} from 'lucide-react';
import { useShots } from '../../store/ShotsStore.jsx';
import { rupees } from '../../data/shotsData.js';

const ICONS = { crown: Crown, star: Star, shield: Shield, diamond: Diamond, sparkles: Sparkles, award: Award };
const COLORS = ['#A855F7', '#3B82F6', '#10B981', '#F4B860', '#E53E3E', '#F97316', '#64748B'];

/**
 * Manages the global list of card tiers (Premium / Standard / Basic + custom).
 * In a real system this list would sync to the staff app; here it's the live state
 * used by the AddMember dialog when staff (or admin) creates a new membership card.
 */
export default function TiersDialog({ open, onClose }) {
  const { tiers, addTier, updateTier, deleteTier, members } = useShots();
  const [editingId, setEditingId] = useState(null); // tier id | 'new' | null
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (!open) { setEditingId(null); setDraft(null); }
  }, [open]);

  const startNew = () => {
    setEditingId('new');
    setDraft({ tier: '', monthly: 1000, color: COLORS[0], icon: 'star', perks: [''] });
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setDraft({ ...t, perks: t.perks?.length ? [...t.perks] : [''] });
  };

  const cancelEdit = () => { setEditingId(null); setDraft(null); };

  const save = () => {
    const cleanPerks = (draft.perks || []).map((p) => p.trim()).filter(Boolean);
    const payload = { ...draft, monthly: Number(draft.monthly) || 0, perks: cleanPerks };
    if (editingId === 'new') addTier(payload);
    else updateTier(editingId, payload);
    cancelEdit();
  };

  const remove = (t) => {
    const used = members.filter((m) => m.type === t.tier).length;
    const msg = used > 0
      ? `${used} member(s) currently use the "${t.tier}" tier. Delete anyway?`
      : `Delete the "${t.tier}" tier?`;
    if (confirm(msg)) deleteTier(t.id);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Membership card types</div>
            <h3 className="text-xl font-extrabold">Manage tiers</h3>
            <p className="text-xs text-ink-500 mt-0.5">These tiers show up when creating a member from any console (admin or staff).</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-3">
          {tiers.map((t) => {
            const Icon = ICONS[t.icon] || Award;
            const isEditing = editingId === t.id;
            const usedCount = members.filter((m) => m.type === t.tier).length;
            return (
              <div key={t.id} className="rounded-2xl border border-slate-200 bg-white">
                {isEditing ? (
                  <TierEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancelEdit} />
                ) : (
                  <div className="p-4 flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-soft"
                      style={{ backgroundColor: t.color }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-extrabold">{t.tier}</div>
                        <span className="chip bg-slate-100 text-ink-600">{usedCount} member{usedCount === 1 ? '' : 's'}</span>
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">{rupees(t.monthly)} / year · {t.perks?.length || 0} perks</div>
                      {t.perks?.length > 0 && (
                        <ul className="text-[12px] text-ink-600 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {t.perks.map((p, i) => (
                            <li key={i} className="flex items-center gap-1">
                              <Check className="w-3 h-3 text-emerald-500" /> {p}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button onClick={() => startEdit(t)} className="btn-ghost text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => remove(t)} className="btn-danger text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            );
          })}

          {/* New tier slot */}
          {editingId === 'new' ? (
            <div className="rounded-2xl border border-brand-200 bg-brand-50/30">
              <TierEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={cancelEdit} />
            </div>
          ) : (
            <button onClick={startNew} className="w-full rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 hover:bg-brand-100 transition px-4 py-4 flex items-center justify-center gap-2 font-bold text-brand-700">
              <Plus className="w-4 h-4" /> Add new tier
            </button>
          )}
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="btn-primary"><Check className="w-4 h-4" /> Done</button>
        </div>
      </div>
    </div>
  );
}

function TierEditor({ draft, setDraft, onSave, onCancel }) {
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setPerk = (i, v) => setDraft((d) => {
    const next = [...d.perks];
    next[i] = v;
    return { ...d, perks: next };
  });
  const addPerk = () => setDraft((d) => ({ ...d, perks: [...d.perks, ''] }));
  const removePerk = (i) => setDraft((d) => ({ ...d, perks: d.perks.filter((_, idx) => idx !== i) }));

  const Icon = ICONS[draft.icon] || Award;

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Tier name</label>
            <input className="input" placeholder="e.g. Platinum" value={draft.tier} onChange={(e) => set('tier', e.target.value)} />
          </div>
          <div>
            <label className="label">Annual price (Rs.)</label>
            <input className="input" type="number" value={draft.monthly} onChange={(e) => set('monthly', e.target.value)} />
          </div>
          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ICONS).map(([key, IC]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set('icon', key)}
                  className={[
                    'w-9 h-9 rounded-lg border flex items-center justify-center transition',
                    draft.icon === key ? 'border-brand-400 bg-brand-50 text-brand-600 ring-2 ring-brand-300' : 'border-slate-200 text-ink-500 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <IC className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="label">Accent color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={[
                    'w-7 h-7 rounded-full border-2 transition',
                    draft.color === c ? 'border-ink-900 scale-110' : 'border-white shadow-soft',
                  ].join(' ')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="label">Perks</label>
            <div className="space-y-2">
              {draft.perks.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder={`Perk ${i + 1} (e.g. 20% discount)`}
                    value={p}
                    onChange={(e) => setPerk(i, e.target.value)}
                  />
                  <button type="button" onClick={() => removePerk(i)} className="btn-ghost px-2"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={addPerk} className="btn-ghost text-xs">
                <Plus className="w-3.5 h-3.5" /> Add perk
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <label className="label">Preview</label>
          <div className="rounded-2xl border border-slate-200 p-4 bg-white">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-soft mb-2"
              style={{ backgroundColor: draft.color }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="font-extrabold">{draft.tier || 'Tier name'}</div>
            <div className="text-xs text-ink-500">{rupees(draft.monthly)} / year</div>
            <ul className="mt-2 space-y-1 text-[12px] text-ink-700">
              {draft.perks.filter(Boolean).map((p, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-emerald-500" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="btn-ghost">Cancel</button>
        <button onClick={onSave} disabled={!draft.tier.trim()} className="btn-primary"><Save className="w-4 h-4" /> Save tier</button>
      </div>
    </div>
  );
}
