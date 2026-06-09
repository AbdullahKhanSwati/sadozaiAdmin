import { useEffect, useMemo, useState } from 'react';
import {
  Bell, Building2, Check, Clock, CreditCard, DollarSign, Globe, Lock, Mail, Save, ShieldCheck, User,
} from 'lucide-react';
import { PageHeader } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
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
    { id: 'rates',        label: 'Pricing & rates',  icon: DollarSign },
    { id: 'hours',        label: 'Opening hours',    icon: Clock },
    { id: 'notifications',label: 'Notifications',    icon: Bell },
    { id: 'security',     label: 'Security',         icon: ShieldCheck },
    { id: 'billing',      label: 'Billing',          icon: CreditCard },
    { id: 'locale',       label: 'Locale',           icon: Globe },
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

          {section === 'rates' && (
            <SectionCard title="Default pricing" description="Used when new tables are added.">
              <Grid2>
                <Field label="Default member rate (Rs. / hr)" type="number" value={form.rates.member} onChange={(e) => setSec('rates', 'member', e.target.value)} />
                <Field label="Default non-member rate (Rs. / hr)" type="number" value={form.rates.nonMember} onChange={(e) => setSec('rates', 'nonMember', e.target.value)} />
                <Field label="VIP member rate (Rs. / hr)" type="number" value={form.rates.vipMember} onChange={(e) => setSec('rates', 'vipMember', e.target.value)} />
                <Field label="VIP non-member rate (Rs. / hr)" type="number" value={form.rates.vipNonMember} onChange={(e) => setSec('rates', 'vipNonMember', e.target.value)} />
              </Grid2>
            </SectionCard>
          )}

          {section === 'hours' && (
            <SectionCard title="Opening hours" description="Default booking window per table.">
              <Grid2>
                <Field label="Open" type="time" value={form.hours.open} onChange={(e) => setSec('hours', 'open', e.target.value)} />
                <Field label="Close" type="time" value={form.hours.close} onChange={(e) => setSec('hours', 'close', e.target.value)} />
                <Field label="Booking interval (minutes)" type="number" value={form.hours.interval} onChange={(e) => setSec('hours', 'interval', e.target.value)} />
              </Grid2>
            </SectionCard>
          )}

          {section === 'notifications' && (
            <SectionCard title="Notifications" description="Choose what to be notified about.">
              <ToggleRow label="New booking" hint="When a member or guest reserves a table." checked={form.notifications.newBooking} onChange={(v) => setSec('notifications', 'newBooking', v)} />
              <ToggleRow label="Expiring memberships" hint="One week before expiry." checked={form.notifications.expiringMemberships} onChange={(v) => setSec('notifications', 'expiringMemberships', v)} />
              <ToggleRow label="Big expenses" hint="Any expense above Rs. 5,000." checked={form.notifications.bigExpenses} onChange={(v) => setSec('notifications', 'bigExpenses', v)} />
              <ToggleRow label="Daily summary email" hint="Sent at midnight." checked={form.notifications.dailySummary} onChange={(v) => setSec('notifications', 'dailySummary', v)} />
            </SectionCard>
          )}

          {section === 'security' && (
            <SectionCard title="Security" description="Keep your admin account safe.">
              <Grid2>
                <Field label="Current password" type="password" placeholder="••••••••" value={pwd.current} onChange={(e) => setPwd((s) => ({ ...s, current: e.target.value }))} />
                <div className="hidden sm:block" />
                <Field label="New password" type="password" placeholder="At least 8 characters" value={pwd.next} onChange={(e) => setPwd((s) => ({ ...s, next: e.target.value }))} />
                <Field label="Confirm new password" type="password" value={pwd.confirm} onChange={(e) => setPwd((s) => ({ ...s, confirm: e.target.value }))} />
              </Grid2>
              <ToggleRow label="Two-factor authentication" hint="Receive a code by SMS or email." checked={form.security.twoFactor} onChange={(v) => setSec('security', 'twoFactor', v)} />
              <ToggleRow label="Session auto-logout" hint="Sign out after 30 minutes of inactivity." checked={form.security.autoLogout} onChange={(v) => setSec('security', 'autoLogout', v)} />
            </SectionCard>
          )}

          {section === 'billing' && (
            <SectionCard title="Billing" description="Subscription & invoices.">
              <div className="rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-ink-500" />
                <div className="flex-1">
                  <div className="font-bold">Visa ending 4242</div>
                  <div className="text-xs text-ink-500">Expires 09/28</div>
                </div>
                <button className="btn-ghost text-xs">Replace</button>
              </div>
              <p className="text-xs text-ink-500 mt-3">Next invoice on 1 June 2026 · Rs. 12,000</p>
            </SectionCard>
          )}

          {section === 'locale' && (
            <SectionCard title="Locale" description="Currency & formatting.">
              <Grid2>
                <div>
                  <label className="label">Currency</label>
                  <select className="input" value={form.locale.currency} onChange={(e) => setSec('locale', 'currency', e.target.value)}>
                    <option>PKR — Pakistani Rupee</option><option>USD</option><option>AED</option>
                  </select>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select className="input" value={form.locale.timezone} onChange={(e) => setSec('locale', 'timezone', e.target.value)}>
                    <option>Asia/Karachi (UTC+5)</option><option>UTC</option><option>Asia/Dubai (UTC+4)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Date format</label>
                  <select className="input" value={form.locale.dateFormat} onChange={(e) => setSec('locale', 'dateFormat', e.target.value)}>
                    <option>DD MMM YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option>
                  </select>
                </div>
                <div>
                  <label className="label">First day of week</label>
                  <select className="input" value={form.locale.firstDay} onChange={(e) => setSec('locale', 'firstDay', e.target.value)}>
                    <option>Monday</option><option>Sunday</option>
                  </select>
                </div>
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

function ToggleRow({ label, hint, checked, onChange }) {
  const on = !!checked;
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        {hint && <div className="text-xs text-ink-500">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={[
          'relative w-11 h-6 rounded-full transition shrink-0',
          on ? 'bg-brand-gradient' : 'bg-slate-200',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition',
            on ? 'left-[22px]' : 'left-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
