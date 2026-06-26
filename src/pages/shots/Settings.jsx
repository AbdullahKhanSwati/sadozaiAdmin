import { useEffect, useMemo, useState } from 'react';
import {
  Building2, Check, Mail, Plus, Save, ShieldCheck, Timer, Trash2, User,
} from 'lucide-react';
import { PageHeader } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import { minutesToLabel } from '../../data/shotsData.js';
import { supabase } from '../../lib/supabase.js';

const DEFAULTS = {
  profile: {
    name: 'Shots Snooker & Pool Club', tagline: 'Premium Club',
    email: '', phone: '+92 333 444 5566', address: 'Main Boulevard, Peshawar',
  },
  rates: { member: 500, nonMember: 700, vipMember: 700, vipNonMember: 1000 },
  hours: { open: '11:00', close: '23:00', interval: 15 },
  notifications: { newBooking: true, expiringMemberships: true, bigExpenses: false, dailySummary: true },
  security: { twoFactor: false, autoLogout: true },
  locale: {
    currency: 'PKR — Pakistani Rupee', timezone: 'Asia/Karachi (UTC+5)',
    dateFormat: 'DD MMM YYYY', firstDay: 'Monday',
  },
};

export default function Settings() {
  const { session } = useAuth();
  const businessId = session?.businessId;
  const [section, setSection] = useState('business');

  const baseDefaults = useMemo(() => ({
    ...DEFAULTS,
    profile: { ...DEFAULTS.profile, email: session?.email || 'admin@shots.com' },
  }), [session?.email]);

  const [form, setForm] = useState(baseDefaults);
  const [account, setAccount] = useState({ name: 'Admin User', role: 'Owner', email: '', phone: '+92 300 0000000' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);

  // Load saved settings + profile
  useEffect(() => {
    if (!businessId) return;
    let active = true;
    (async () => {
      const { data: row } = await supabase
        .from('business_settings').select('*').eq('business_id', businessId).maybeSingle();
      if (!active) return;
      setForm({
        profile: { ...baseDefaults.profile, ...(row?.profile || {}) },
        rates: { ...baseDefaults.rates, ...(row?.rates || {}) },
        hours: { ...baseDefaults.hours, ...(row?.hours || {}) },
        notifications: { ...baseDefaults.notifications, ...(row?.notifications || {}) },
        security: { ...baseDefaults.security, ...(row?.security || {}) },
        locale: { ...baseDefaults.locale, ...(row?.locale || {}) },
      });
      const p = session?.profile;
      setAccount({
        name: p?.name || 'Admin User',
        role: p?.role || 'Owner',
        email: p?.email || session?.email || '',
        phone: p?.phone || '+92 300 0000000',
      });
    })();
    return () => { active = false; };
  }, [businessId, baseDefaults, session?.profile, session?.email]);

  const setSec = (sec, key, val) => setForm((s) => ({ ...s, [sec]: { ...s[sec], [key]: val } }));

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    setSavedAt(false);
    try {
      await supabase.from('business_settings').update({
        profile: form.profile,
        rates: form.rates,
        hours: form.hours,
        notifications: form.notifications,
        security: form.security,
        locale: form.locale,
        updated_at: new Date().toISOString(),
      }).eq('business_id', businessId);

      if (session?.user?.id) {
        await supabase.from('profiles').update({
          name: account.name, role: account.role, email: account.email, phone: account.phone,
        }).eq('user_id', session.user.id);
      }

      if (pwd.next) {
        if (pwd.next.length < 8) throw new Error('New password must be at least 8 characters.');
        if (pwd.next !== pwd.confirm) throw new Error('New password and confirmation do not match.');
        const { error } = await supabase.auth.updateUser({ password: pwd.next });
        if (error) throw error;
        setPwd({ current: '', next: '', confirm: '' });
      }
      setSavedAt(true);
    } catch (e) {
      // eslint-disable-next-line no-alert
      alert(e?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'business',     label: 'Business profile', icon: Building2 },
    { id: 'durations',    label: 'Booking durations', icon: Timer },
    { id: 'security',     label: 'Security',         icon: ShieldCheck },
    { id: 'account',      label: 'Account',          icon: User },
  ];

  return (
    <>
      <PageHeader title="Settings" subtitle="Configure how the Shots admin panel runs." />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <aside className="card p-3 h-fit lg:sticky lg:top-20">
          <ul className="space-y-1">
            {sections.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setSection(s.id)}
                    className={[
                      'w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                      active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="lg:col-span-3 space-y-4">
          {section === 'business' && (
            <SectionCard title="Business profile" description="Public details for your venue.">
              <Grid2>
                <Field label="Business name" value={form.profile.name} onChange={(e) => setSec('profile', 'name', e.target.value)} />
                <Field label="Tagline" value={form.profile.tagline} onChange={(e) => setSec('profile', 'tagline', e.target.value)} />
                <Field label="Email" value={form.profile.email} onChange={(e) => setSec('profile', 'email', e.target.value)} />
                <Field label="Phone" value={form.profile.phone} onChange={(e) => setSec('profile', 'phone', e.target.value)} />
                <Field label="Address" value={form.profile.address} onChange={(e) => setSec('profile', 'address', e.target.value)} className="sm:col-span-2" />
              </Grid2>
            </SectionCard>
          )}

          {section === 'durations' && <DurationsSection />}

          {section === 'security' && (
            <SectionCard title="Security" description="Keep your admin account safe.">
              <Grid2>
                <Field label="Current password" type="password" placeholder="••••••••" value={pwd.current} onChange={(e) => setPwd((s) => ({ ...s, current: e.target.value }))} />
                <div className="hidden sm:block" />
                <Field label="New password" type="password" placeholder="At least 8 characters" value={pwd.next} onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))} />
                <Field label="Confirm new password" type="password" value={pwd.confirm} onChange={(e) => setPwd((s) => ({ ...s, confirm: e.target.value }))} />
              </Grid2>
            </SectionCard>
          )}

          {section === 'account' && (
            <SectionCard title="Account" description="Your personal admin profile.">
              <Grid2>
                <Field label="Name" value={account.name} onChange={(e) => setAccount((s) => ({ ...s, name: e.target.value }))} />
                <Field label="Role" value={account.role} onChange={(e) => setAccount((s) => ({ ...s, role: e.target.value }))} />
                <Field label="Email" type="email" value={account.email} onChange={(e) => setAccount((s) => ({ ...s, email: e.target.value }))} icon={<Mail className="w-4 h-4 text-ink-400" />} />
                <Field label="Phone" value={account.phone} onChange={(e) => setAccount((s) => ({ ...s, phone: e.target.value }))} />
              </Grid2>
            </SectionCard>
          )}

          <div className="flex justify-end items-center gap-3">
            {savedAt && (
              <span className="text-sm font-semibold text-emerald-600 inline-flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved
              </span>
            )}
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="card p-5">
      <div className="mb-4">
        <h3 className="text-lg font-extrabold">{title}</h3>
        {description && <p className="text-sm text-ink-500 mt-0.5">{description}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Grid2({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, className, icon, ...rest }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10">{icon}</span>}
        <input className={['input', icon ? 'pl-9' : ''].join(' ')} {...rest} />
      </div>
    </div>
  );
}

function DurationsSection() {
  const { bookingDurations, addBookingDuration, deleteBookingDuration } = useShots();
  const [mins, setMins] = useState('');
  const [err, setErr] = useState('');

  const add = async () => {
    setErr('');
    const m = Number(mins);
    if (!m || m <= 0) return setErr('Enter a number of minutes greater than 0.');
    if (bookingDurations.some((d) => d.minutes === m)) return setErr(`${m} minutes already exists.`);
    try { await addBookingDuration(m); setMins(''); }
    catch (e) { setErr(e?.message || 'Could not add duration.'); }
  };

  return (
    <SectionCard title="Booking durations" description="The duration options shown when booking a table (admin & staff). Changes apply instantly.">
      <div className="space-y-2">
        {bookingDurations.length === 0 && (
          <p className="text-sm text-ink-500">No durations yet. Add your first one below.</p>
        )}
        {bookingDurations.map((d) => (
          <DurationRow key={d.id} d={d} onDelete={() => deleteBookingDuration(d.id)} />
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          className="input flex-1"
          type="number"
          placeholder="Minutes (e.g. 60)"
          value={mins}
          onChange={(e) => setMins(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button onClick={add} className="btn-primary"><Plus className="w-4 h-4" /> Add duration</button>
      </div>
      {err && <div className="mt-2 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{err}</div>}
    </SectionCard>
  );
}

function DurationRow({ d, onDelete }) {
  const { updateBookingDuration } = useShots();
  const [val, setVal] = useState(String(d.minutes));
  const changed = Number(val) !== d.minutes && Number(val) > 0;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-2.5">
      <Timer className="w-4 h-4 text-ink-400 shrink-0" />
      <input
        className="input w-24"
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
      />
      <span className="text-sm font-semibold text-ink-600">min · shows as “{minutesToLabel(Number(val) || 0)}”</span>
      <div className="ml-auto flex gap-2">
        {changed && (
          <button onClick={() => updateBookingDuration(d.id, Number(val))} className="btn-primary px-2.5 py-1.5 text-xs">
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        )}
        <button onClick={onDelete} className="btn-danger px-2.5 py-1.5 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

