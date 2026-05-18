import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar, Camera, Check, CreditCard, Mail, Phone, Plus, Save, Trash2, Upload, User, X,
} from 'lucide-react';
import {
  generateMemberId, membershipDurations, rupees,
} from '../../data/shotsData.js';
import { useShots } from '../../store/ShotsStore.jsx';
import MembershipVirtualCard from '../MembershipVirtualCard.jsx';

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  cnic: '',
  cnicImage: null,
  photo: null,
  type: 'Premium',
  durationLabel: '1 Year',
  price: '',
};

/**
 * Mirrors the staff AddMemberScreen 1:1:
 *  - Live preview of the virtual membership card
 *  - Photo upload (member photo & ID card)
 *  - CNIC field with auto-generated Member ID
 *  - Tier picker driven by the live tiers store
 *  - Membership duration → computed expiry date
 *  - Optional membership price (added to revenue when set)
 */
export default function MemberDialog({ open, onClose, member }) {
  const { tiers, members, addMember, updateMember, deleteMember, addFinanceEntry } = useShots();
  const editing = !!member;
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const photoInputRef = useRef(null);
  const idInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      const months = Math.max(1, Math.round((new Date(member.expiryDate) - new Date(member.joinDate)) / (1000 * 60 * 60 * 24 * 30)));
      const dur = membershipDurations.find((d) => d.months === months) || membershipDurations[3];
      setForm({
        name: member.name || '',
        phone: member.phone || '',
        email: member.email || '',
        cnic: member.cnic || '',
        cnicImage: member.cnicImage || null,
        photo: member.photo || null,
        type: member.type || tiers[0]?.tier || 'Premium',
        durationLabel: dur.label,
        price: '',
      });
    } else {
      setForm({ ...EMPTY, type: tiers[tiers.length - 1]?.tier || 'Premium' });
    }
    setError('');
  }, [open, editing, member, tiers]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const duration = useMemo(
    () => membershipDurations.find((d) => d.label === form.durationLabel) || membershipDurations[3],
    [form.durationLabel]
  );

  const existingIds = useMemo(() => members.map((m) => m.id).filter((id) => !editing || id !== member?.id), [members, editing, member]);

  const computedId = useMemo(() => {
    if (editing) return member.id;
    if (!form.cnic || form.cnic.replace(/\D/g, '').length < 6) return null;
    return generateMemberId(form.cnic, existingIds);
  }, [editing, member, form.cnic, existingIds]);

  const expiryDate = useMemo(() => {
    if (editing && form.durationLabel === membershipDurations.find((d) => d.months === Math.round((new Date(member.expiryDate) - new Date(member.joinDate)) / (1000 * 60 * 60 * 24 * 30)))?.label) {
      return member.expiryDate;
    }
    const d = new Date();
    d.setMonth(d.getMonth() + duration.months);
    return d.toISOString().slice(0, 10);
  }, [duration, editing, member, form.durationLabel]);

  const previewMember = {
    id: computedId || 'A------',
    name: form.name || 'NEW MEMBER',
    type: form.type,
    expiryDate,
    status: 'Active',
    photo: form.photo,
  };

  const onPickPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setField('photo', ev.target.result);
    reader.readAsDataURL(f);
  };

  const onPickCnic = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setField('cnicImage', f.name);
  };

  const canSubmit = form.name && form.phone && form.cnic && computedId;

  const handleSave = () => {
    setError('');
    if (!canSubmit) return setError('Name, phone and CNIC are all required.');

    if (editing) {
      updateMember(member.id, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        cnic: form.cnic,
        cnicImage: form.cnicImage,
        photo: form.photo,
        type: form.type,
        expiryDate,
        status: new Date(expiryDate) >= new Date() ? 'Active' : 'Expired',
      });
    } else {
      addMember({
        id: computedId,
        name: form.name,
        phone: form.phone,
        email: form.email,
        cnic: form.cnic,
        cnicImage: form.cnicImage,
        photo: form.photo,
        type: form.type,
        joinDate: new Date().toISOString().slice(0, 10),
        expiryDate,
        status: 'Active',
        visits: 0,
        totalSpent: 0,
      });
      if (Number(form.price) > 0) {
        addFinanceEntry({
          type: 'In',
          category: 'Membership',
          amount: Number(form.price),
          description: `New ${form.type} membership — ${form.name}`,
        });
      }
    }
    onClose();
  };

  const handleDelete = () => {
    if (!editing) return;
    if (confirm(`Delete member ${member.name}? This action cannot be undone.`)) {
      deleteMember(member.id);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-4xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">{editing ? 'Edit member' : 'New member'}</div>
            <h3 className="text-xl font-extrabold">{editing ? member.name : 'Add membership'}</h3>
            <p className="text-xs text-ink-500 mt-0.5">Creates a virtual membership card with QR.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* LIVE PREVIEW */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-[11px] uppercase tracking-widest text-ink-500 font-bold">Live preview</div>
            <MembershipVirtualCard member={previewMember} />
            {computedId && !editing && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-800 flex items-start gap-2">
                <Check className="w-4 h-4 mt-0.5" />
                <span>
                  Auto-generated Member ID: <span className="font-extrabold font-mono">{computedId}</span>
                  {computedId.startsWith('B') && ' · prefix A taken, used B'}
                </span>
              </div>
            )}
            <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2 text-xs text-brand-800 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              Expires <span className="font-extrabold">{new Date(expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* FORM */}
          <div className="lg:col-span-3 space-y-4">
            {/* Member photo */}
            <Section label="Member photo">
              <button
                type="button"
                onClick={() => (form.photo ? setField('photo', null) : photoInputRef.current?.click())}
                className="w-full rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 hover:bg-brand-100 transition px-4 py-5 flex items-center justify-center gap-3"
              >
                {form.photo ? (
                  <>
                    <img src={form.photo} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    <div className="text-left">
                      <div className="font-bold text-ink-800 text-sm">Photo attached</div>
                      <div className="text-[11px] text-ink-500">Click to remove</div>
                    </div>
                    <X className="w-4 h-4 text-ink-400 ml-auto" />
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center">
                      <Camera className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-brand-700">Add member photo</div>
                      <div className="text-[11px] text-ink-500">Appears on the membership card</div>
                    </div>
                  </>
                )}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} />
            </Section>

            {/* Personal */}
            <Section label="Personal details">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Full name" icon={<User className="w-4 h-4 text-ink-400" />}>
                  <input className="input pl-9" placeholder="e.g. Ahmed Khan" value={form.name} onChange={(e) => setField('name', e.target.value)} />
                </Field>
                <Field label="Phone" icon={<Phone className="w-4 h-4 text-ink-400" />}>
                  <input className="input pl-9" placeholder="+92 300 1234567" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </Field>
                <Field label="Email (optional)" icon={<Mail className="w-4 h-4 text-ink-400" />} className="col-span-2">
                  <input className="input pl-9" placeholder="member@example.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </Field>
              </div>
            </Section>

            {/* Identity */}
            <Section label="Identity verification">
              <button
                type="button"
                onClick={() => (form.cnicImage ? setField('cnicImage', null) : idInputRef.current?.click())}
                className="w-full rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 hover:bg-brand-100 transition px-4 py-4 flex items-center gap-3"
              >
                {form.cnicImage ? (
                  <>
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"><Check className="w-5 h-5" /></div>
                    <div className="text-left flex-1">
                      <div className="font-bold text-ink-800 text-sm">ID card uploaded</div>
                      <div className="text-[11px] text-ink-500 truncate">{form.cnicImage}</div>
                    </div>
                    <X className="w-4 h-4 text-ink-400" />
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center">
                      <Upload className="w-5 h-5 text-brand-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-brand-700">Upload ID card</div>
                      <div className="text-[11px] text-ink-500">Capture or pick from gallery</div>
                    </div>
                  </>
                )}
              </button>
              <input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={onPickCnic} />

              <Field label="CNIC" icon={<CreditCard className="w-4 h-4 text-ink-400" />} className="mt-3">
                <input
                  className="input pl-9 font-mono"
                  placeholder="35202-1234567-1"
                  value={form.cnic}
                  onChange={(e) => setField('cnic', e.target.value)}
                  disabled={editing}
                />
              </Field>
            </Section>

            {/* Tier */}
            <Section label="Membership tier" hint={`${tiers.length} tier${tiers.length === 1 ? '' : 's'} available`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {tiers.map((t) => {
                  const active = form.type === t.tier;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setField('type', t.tier)}
                      className={[
                        'rounded-xl border p-3 text-left transition',
                        active ? 'border-brand-400 ring-2 ring-brand-300 bg-brand-50' : 'border-slate-200 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold">{t.tier}</span>
                        <span className="text-xs font-bold text-ink-500">{rupees(t.monthly)}</span>
                      </div>
                      <div className="text-[11px] text-ink-500 mt-0.5 line-clamp-1">{t.perks?.[0] || 'No perks listed'}</div>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Duration */}
            <Section label="Expiration">
              <div className="flex flex-wrap gap-1.5">
                {membershipDurations.map((d) => {
                  const active = form.durationLabel === d.label;
                  return (
                    <button
                      key={d.label}
                      type="button"
                      onClick={() => setField('durationLabel', d.label)}
                      className={[
                        'px-3 py-1.5 rounded-full text-xs font-bold border',
                        active ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-slate-200 text-ink-600 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Price (only when creating) */}
            {!editing && (
              <Section label="Membership price" hint="Optional — added to today's revenue when the member is created">
                <div className="flex items-stretch rounded-xl border-2 border-brand-300 bg-brand-50 overflow-hidden">
                  <span className="px-4 py-2 text-brand-700 font-extrabold text-lg">Rs.</span>
                  <input
                    type="number"
                    className="flex-1 bg-transparent border-0 outline-none px-2 text-xl font-extrabold text-ink-800"
                    placeholder="0"
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                  />
                </div>
              </Section>
            )}
          </div>
        </div>

        {error && <div className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex items-center justify-between gap-2 mt-6">
          {editing ? (
            <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-4 h-4" /> Delete member</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={handleSave} disabled={!canSubmit} className="btn-primary">
              {editing ? <><Save className="w-4 h-4" /> Save changes</> : <><Plus className="w-4 h-4" /> Create membership</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, hint, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[11px] uppercase tracking-widest text-ink-500 font-bold">{label}</div>
        {hint && <div className="text-[11px] text-ink-400 font-medium">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, icon, className, children }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>}
        {children}
      </div>
    </div>
  );
}
