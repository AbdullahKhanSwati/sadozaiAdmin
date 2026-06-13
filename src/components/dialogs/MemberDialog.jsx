import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar, Camera, Check, CreditCard, Mail, Phone, Plus, Save, Trash2, Upload, User, X,
} from 'lucide-react';
import { generateMemberId, rupees } from '../../data/shotsData.js';

// Memberships run for one year. Returns the date one year after `from`
// (defaults to today), as a YYYY-MM-DD string.
function oneYearFrom(from) {
  const d = from ? new Date(from) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}
import { useShots } from '../../store/ShotsStore.jsx';
import { uploadToBucket, signedUrl } from '../../lib/supabase.js';
import MembershipVirtualCard from '../MembershipVirtualCard.jsx';

const EMPTY = {
  name: '',
  phone: '',
  email: '',
  cnic: '',
  cnicImage: null,
  cnicImageBack: null,
  photo: null,
  type: 'Premium',
  expiryDate: '',
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
  const [photoFile, setPhotoFile] = useState(null);
  const [cnicFile, setCnicFile] = useState(null);
  const [cnicBackFile, setCnicBackFile] = useState(null);
  const [saving, setSaving] = useState(false);
  // Local data-URL previews of just-picked CNIC images (for instant display).
  const [cnicPreview, setCnicPreview] = useState(null);
  const [cnicBackPreview, setCnicBackPreview] = useState(null);
  // Signed URLs for already-saved CNIC images (when editing).
  const [cnicViewUrls, setCnicViewUrls] = useState({ front: null, back: null });
  const photoInputRef = useRef(null);
  const idInputRef = useRef(null);
  const idBackInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: member.name || '',
        phone: member.phone || '',
        email: member.email || '',
        cnic: member.cnic || '',
        cnicImage: member.cnicImage || null,
        cnicImageBack: member.cnicImageBack || null,
        photo: member.photo || null,
        type: member.type || tiers[0]?.tier || 'Premium',
        expiryDate: member.expiryDate || oneYearFrom(),
        price: '',
      });
    } else {
      setForm({ ...EMPTY, type: tiers[tiers.length - 1]?.tier || 'Premium', expiryDate: oneYearFrom() });
    }
    setPhotoFile(null);
    setCnicFile(null);
    setCnicBackFile(null);
    setCnicPreview(null);
    setCnicBackPreview(null);
    setCnicViewUrls({ front: null, back: null });
    setError('');
  }, [open, editing, member, tiers]);

  // When editing, resolve viewable signed URLs for already-saved ID card images.
  useEffect(() => {
    if (!open || !editing) return;
    let active = true;
    (async () => {
      const [front, back] = await Promise.all([
        signedUrl('member-cnic', member?.cnicImage),
        signedUrl('member-cnic', member?.cnicImageBack),
      ]);
      if (active) setCnicViewUrls({ front, back });
    })();
    return () => { active = false; };
  }, [open, editing, member?.cnicImage, member?.cnicImageBack]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const existingIds = useMemo(() => members.map((m) => m.id).filter((id) => !editing || id !== member?.id), [members, editing, member]);

  const computedId = useMemo(() => {
    if (editing) return member.id;
    if (!form.cnic || form.cnic.replace(/\D/g, '').length < 6) return null;
    return generateMemberId(form.cnic, existingIds);
  }, [editing, member, form.cnic, existingIds]);

  const expiryDate = form.expiryDate || oneYearFrom();

  // Extend the membership by a year from whichever is later: today or the
  // current expiry. Lets "edit → save" renew an existing member.
  const extendOneYear = () => {
    const cur = form.expiryDate ? new Date(form.expiryDate) : new Date();
    const base = cur > new Date() ? form.expiryDate : undefined;
    setField('expiryDate', oneYearFrom(base));
  };

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
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setField('photo', ev.target.result); // data URL for live preview
    reader.readAsDataURL(f);
  };

  const onPickCnic = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCnicFile(f);
    setField('cnicImage', f.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCnicPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const onPickCnicBack = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCnicBackFile(f);
    setField('cnicImageBack', f.name);
    const reader = new FileReader();
    reader.onload = (ev) => setCnicBackPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  // Open a stored (private) ID-card image in a new tab via a signed URL.
  const viewImage = async (path) => {
    const url = await signedUrl('member-cnic', path);
    if (url) window.open(url, '_blank', 'noopener');
    else alert('Could not open the image.');
  };

  const canSubmit = form.name && form.phone && form.cnic && computedId;

  const handleSave = async () => {
    setError('');
    if (!canSubmit) return setError('Name, phone and CNIC are all required.');

    setSaving(true);
    // Upload newly picked images to Storage; keep existing values otherwise.
    let photo = form.photo;
    let cnicImage = form.cnicImage;
    let cnicImageBack = form.cnicImageBack;
    try {
      if (photoFile) photo = await uploadToBucket('member-photos', photoFile, 'members/');
      if (cnicFile) cnicImage = await uploadToBucket('member-cnic', cnicFile, 'cnic/');
      if (cnicBackFile) cnicImageBack = await uploadToBucket('member-cnic', cnicBackFile, 'cnic/');
    } catch (e) {
      setSaving(false);
      return setError(`Image upload failed: ${e?.message || 'unknown error'}`);
    }

    try {
      if (editing) {
        await updateMember(member.id, {
          name: form.name,
          phone: form.phone,
          email: form.email,
          cnic: form.cnic,
          cnicImage,
          cnicImageBack,
          photo,
          type: form.type,
          expiryDate,
          status: new Date(expiryDate) >= new Date() ? 'Active' : 'Expired',
        });
      } else {
        await addMember({
          id: computedId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          cnic: form.cnic,
          cnicImage,
          cnicImageBack,
          photo,
          type: form.type,
          joinDate: new Date().toISOString().slice(0, 10),
          expiryDate,
          status: 'Active',
          visits: 0,
          totalSpent: 0,
        });
        if (Number(form.price) > 0) {
          await addFinanceEntry({
            type: 'In',
            category: 'Membership',
            amount: Number(form.price),
            description: `New ${form.type} membership — ${form.name}`,
          });
        }
      }
    } finally {
      setSaving(false);
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

            {/* ID card images — shown below the membership card */}
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-500 font-bold mb-2">ID card</div>
              <div className="grid grid-cols-2 gap-2">
                <IdCardPreview label="Front" src={cnicPreview || cnicViewUrls.front} />
                <IdCardPreview label="Back" src={cnicBackPreview || cnicViewUrls.back} />
              </div>
            </div>
          </div>

          {/* FORM */}
          <div className="lg:col-span-3 space-y-4">
            {/* Member photo */}
            <Section label="Member photo">
              <button
                type="button"
                onClick={() => { if (form.photo) { setField('photo', null); setPhotoFile(null); } else photoInputRef.current?.click(); }}
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
            <Section label="Identity verification" hint="Front & back of the ID card">
              <div className="grid grid-cols-2 gap-3">
                <IdCardSlot
                  label="ID card — Front"
                  filename={form.cnicImage}
                  persisted={editing ? member.cnicImage : null}
                  hasNewFile={!!cnicFile}
                  onPick={() => idInputRef.current?.click()}
                  onRemove={() => { setField('cnicImage', null); setCnicFile(null); }}
                  onView={() => viewImage(member.cnicImage)}
                />
                <IdCardSlot
                  label="ID card — Back"
                  filename={form.cnicImageBack}
                  persisted={editing ? member.cnicImageBack : null}
                  hasNewFile={!!cnicBackFile}
                  onPick={() => idBackInputRef.current?.click()}
                  onRemove={() => { setField('cnicImageBack', null); setCnicBackFile(null); }}
                  onView={() => viewImage(member.cnicImageBack)}
                />
              </div>
              <input ref={idInputRef} type="file" accept="image/*" className="hidden" onChange={onPickCnic} />
              <input ref={idBackInputRef} type="file" accept="image/*" className="hidden" onChange={onPickCnicBack} />

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
                        <span className="text-xs font-bold text-ink-500">{rupees(t.monthly)}/yr</span>
                      </div>
                      <div className="text-[11px] text-ink-500 mt-0.5 line-clamp-1">{t.perks?.[0] || 'No perks listed'}</div>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Membership term — 1 year; expiry editable */}
            <Section label="Membership term" hint="Memberships run for 1 year">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="label">Expiry date</label>
                  <input
                    type="date"
                    className="input"
                    value={form.expiryDate}
                    onChange={(e) => setField('expiryDate', e.target.value)}
                  />
                </div>
                <button type="button" onClick={extendOneYear} className="btn-ghost whitespace-nowrap">
                  <Calendar className="w-4 h-4" /> Extend 1 year
                </button>
              </div>
              {editing && (
                <p className="text-[11px] text-ink-500 mt-2">
                  Saving updates this member to the expiry above. Tap “Extend 1 year” to renew, or edit the date manually.
                </p>
              )}
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
            <button onClick={handleSave} disabled={!canSubmit || saving} className="btn-primary">
              {editing ? <><Save className="w-4 h-4" /> Save changes</> : <><Plus className="w-4 h-4" /> Create membership</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function IdCardPreview({ label, src }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-ink-500 mb-1">{label}</div>
      {src ? (
        <a href={src} target="_blank" rel="noopener noreferrer" className="block">
          <img src={src} alt={`ID card ${label}`} className="w-full h-24 object-cover rounded-xl border border-slate-200 hover:opacity-90 transition" />
        </a>
      ) : (
        <div className="w-full h-24 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-ink-400">
          <CreditCard className="w-5 h-5" />
          <span className="text-[10px] mt-1">No image</span>
        </div>
      )}
    </div>
  );
}

function IdCardSlot({ label, filename, persisted, hasNewFile, onPick, onRemove, onView }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-3">
      <div className="text-[11px] font-bold text-ink-600 mb-2">{label}</div>
      {filename ? (
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0"><Check className="w-4 h-4" /></div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-ink-800 text-xs">Attached</div>
            <div className="text-[11px] text-ink-500 truncate">{filename}</div>
          </div>
          <button type="button" onClick={onRemove} className="p-1 rounded hover:bg-white/60"><X className="w-4 h-4 text-ink-400" /></button>
        </div>
      ) : (
        <button type="button" onClick={onPick} className="w-full flex items-center gap-2 hover:opacity-80">
          <div className="w-9 h-9 rounded-xl bg-white shadow-soft flex items-center justify-center shrink-0"><Upload className="w-4 h-4 text-brand-600" /></div>
          <span className="text-xs font-bold text-brand-700">Upload image</span>
        </button>
      )}
      {/* View only makes sense for an already-saved image and when no new pick is pending */}
      {persisted && !hasNewFile && filename && (
        <button type="button" onClick={onView} className="mt-2 text-[11px] font-bold text-brand-600 hover:underline">
          View image
        </button>
      )}
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
