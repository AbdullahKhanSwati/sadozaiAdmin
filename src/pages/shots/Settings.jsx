import { useState } from 'react';
import {
  Bell, Building2, Clock, CreditCard, DollarSign, Globe, Lock, Mail, Save, ShieldCheck, User,
} from 'lucide-react';
import { PageHeader } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Settings() {
  const { session } = useAuth();
  const [section, setSection] = useState('business');

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
                <Field label="Business name" defaultValue="Shots Snooker & Pool Club" />
                <Field label="Tagline" defaultValue="Premium Club" />
                <Field label="Email" defaultValue={session?.email || 'admin@shots.com'} />
                <Field label="Phone" defaultValue="+92 333 444 5566" />
                <Field label="Address" defaultValue="Main Boulevard, Peshawar" className="sm:col-span-2" />
              </Grid2>
            </SectionCard>
          )}

          {section === 'rates' && (
            <SectionCard title="Default pricing" description="Used when new tables are added.">
              <Grid2>
                <Field label="Default member rate (Rs. / hr)" defaultValue={500} type="number" />
                <Field label="Default non-member rate (Rs. / hr)" defaultValue={700} type="number" />
                <Field label="VIP member rate (Rs. / hr)" defaultValue={700} type="number" />
                <Field label="VIP non-member rate (Rs. / hr)" defaultValue={1000} type="number" />
              </Grid2>
            </SectionCard>
          )}

          {section === 'hours' && (
            <SectionCard title="Opening hours" description="Default booking window per table.">
              <Grid2>
                <Field label="Open" defaultValue="11:00" type="time" />
                <Field label="Close" defaultValue="23:00" type="time" />
                <Field label="Booking interval (minutes)" defaultValue={15} type="number" />
              </Grid2>
            </SectionCard>
          )}

          {section === 'notifications' && (
            <SectionCard title="Notifications" description="Choose what to be notified about.">
              <ToggleRow label="New booking" hint="When a member or guest reserves a table." defaultChecked />
              <ToggleRow label="Expiring memberships" hint="One week before expiry." defaultChecked />
              <ToggleRow label="Big expenses" hint="Any expense above Rs. 5,000." />
              <ToggleRow label="Daily summary email" hint="Sent at midnight." defaultChecked />
            </SectionCard>
          )}

          {section === 'security' && (
            <SectionCard title="Security" description="Keep your admin account safe.">
              <Grid2>
                <Field label="Current password" type="password" placeholder="••••••••" />
                <div className="hidden sm:block" />
                <Field label="New password" type="password" placeholder="At least 8 characters" />
                <Field label="Confirm new password" type="password" />
              </Grid2>
              <ToggleRow label="Two-factor authentication" hint="Receive a code by SMS or email." />
              <ToggleRow label="Session auto-logout" hint="Sign out after 30 minutes of inactivity." defaultChecked />
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
                  <select className="input"><option>PKR — Pakistani Rupee</option><option>USD</option><option>AED</option></select>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select className="input"><option>Asia/Karachi (UTC+5)</option><option>UTC</option><option>Asia/Dubai (UTC+4)</option></select>
                </div>
                <div>
                  <label className="label">Date format</label>
                  <select className="input"><option>DD MMM YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select>
                </div>
                <div>
                  <label className="label">First day of week</label>
                  <select className="input"><option>Monday</option><option>Sunday</option></select>
                </div>
              </Grid2>
            </SectionCard>
          )}

          {section === 'account' && (
            <SectionCard title="Account" description="Your personal admin profile.">
              <Grid2>
                <Field label="Name" defaultValue="Admin User" />
                <Field label="Role" defaultValue="Owner" />
                <Field label="Email" defaultValue={session?.email || 'admin@shots.com'} type="email" icon={<Mail className="w-4 h-4 text-ink-400" />} />
                <Field label="Phone" defaultValue="+92 300 0000000" />
              </Grid2>
            </SectionCard>
          )}

          <div className="flex justify-end">
            <button className="btn-primary"><Save className="w-4 h-4" /> Save changes</button>
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

function Field({ label, className, ...rest }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input className="input" {...rest} />
    </div>
  );
}

function ToggleRow({ label, hint, defaultChecked }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        {hint && <div className="text-xs text-ink-500">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => setOn((s) => !s)}
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
