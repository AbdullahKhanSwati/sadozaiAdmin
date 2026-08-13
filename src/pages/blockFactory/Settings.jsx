import { useState } from 'react';
import { Settings as SettingsIcon, Plus, Trash2 } from 'lucide-react';
import { useBlockFactory } from '../../store/BlockFactoryStore.jsx';
import { Toggle } from './catalogUi.jsx';

// Only the sections that are wired through to the app.
const SECTIONS = ['Receipt', 'Dining options'];

export default function BlockFactorySettings() {
  const [active, setActive] = useState('Receipt');

  return (
    <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
      {/* Left: section list */}
      <div className="bg-white rounded-md border border-slate-200 shadow-soft h-fit">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-semibold text-ink-800">Settings</div>
            <div className="text-xs text-ink-400">System settings</div>
          </div>
        </div>
        <ul>
          {SECTIONS.map((s) => (
            <li key={s}>
              <button
                onClick={() => setActive(s)}
                className={[
                  'w-full text-left px-5 py-4 text-sm border-b border-slate-50 transition',
                  active === s ? 'text-bf-700 font-semibold bg-bf-50' : 'text-ink-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: active section */}
      <div className="bg-white rounded-md border border-slate-200 shadow-soft p-6">
        {active === 'Receipt' && <ReceiptSettings />}
        {active === 'Dining options' && <DiningSettings />}
      </div>
    </div>
  );
}

// ---- Receipt ---------------------------------------------------------------
// header, phone, footer all print on the app's Bluetooth receipt.
function ReceiptSettings() {
  const { settings, saveSettings } = useBlockFactory();
  const r = settings?.receipt || {};
  const set = (patch) => saveSettings({ receipt: { ...r, ...patch } });
  const underlineCls = 'w-full border-b border-slate-300 bg-transparent py-2 text-ink-800 focus:outline-none focus:border-bf-500';
  return (
    <>
      <h2 className="text-2xl font-semibold text-ink-800 mb-1">Receipt</h2>
      <p className="text-sm text-ink-400 mb-6">These print at the top and bottom of the Bluetooth receipt in the app.</p>
      <div className="space-y-6 max-w-md">
        <div>
          <div className="text-xs text-ink-400 mb-1">Header (branch name)</div>
          <input value={r.header || ''} onChange={(e) => set({ header: e.target.value })} placeholder="Doberan Kallan" className={underlineCls} />
        </div>
        <div>
          <div className="text-xs text-ink-400 mb-1">Phone number</div>
          <input value={r.phone || ''} onChange={(e) => set({ phone: e.target.value })} placeholder="03295789178" className={underlineCls} />
        </div>
        <div>
          <div className="text-xs text-ink-400 mb-1">Footer</div>
          <input value={r.footer || ''} onChange={(e) => set({ footer: e.target.value })} placeholder="Thank you for your visit!" className={underlineCls} />
        </div>
      </div>
    </>
  );
}

// ---- Dining options --------------------------------------------------------
// The app loads the enabled options for the ticket's dining dropdown.
function DiningSettings() {
  const { settings, saveSettings } = useBlockFactory();
  const dining = settings?.dining || [];
  const upd = (i, patch) => saveSettings({ dining: dining.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) });
  const add = () => saveSettings({ dining: [...dining, { name: 'New option', enabled: true }] });
  const del = (i) => saveSettings({ dining: dining.filter((_, idx) => idx !== i) });
  return (
    <>
      <h2 className="text-2xl font-semibold text-ink-800 mb-1">Dining options</h2>
      <p className="text-sm text-ink-400 mb-6">Mark orders as dine in, takeout or for delivery. Enabled options appear in the app's ticket.</p>
      <ul className="divide-y divide-slate-100 max-w-lg">
        {dining.map((d, i) => (
          <li key={i} className="flex items-center gap-4 py-4">
            <input value={d.name} onChange={(e) => upd(i, { name: e.target.value })} className="flex-1 border-b border-slate-200 bg-transparent py-1 text-ink-800 focus:outline-none focus:border-bf-500" />
            <Toggle on={!!d.enabled} onChange={(v) => upd(i, { enabled: v })} />
            <button onClick={() => del(i)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
        {dining.length === 0 && <li className="py-4 text-sm text-ink-400">No dining options yet.</li>}
      </ul>
      <button onClick={add} className="flex items-center gap-2 text-bf-600 font-bold text-sm uppercase tracking-wide mt-4">
        <Plus className="w-5 h-5 rounded-full border-2 border-bf-600 p-0.5" /> Add option
      </button>
    </>
  );
}
