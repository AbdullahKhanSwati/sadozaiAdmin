import { useState } from 'react';
import { Settings as SettingsIcon, Plus, Trash2 } from 'lucide-react';
import { featureToggles, settingsSections } from '../../data/munchiesData.js';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { Toggle } from './catalogUi.jsx';

export default function MunchiesSettings() {
  const { settings, saveSettings } = useMunchies();
  const [active, setActive] = useState('Features');

  // Feature flags live in business_settings.features; fall back to seed defaults.
  const defaults = Object.fromEntries(featureToggles.map((f) => [f.key, f.on]));
  const toggles = { ...defaults, ...(settings?.features || {}) };

  const flip = (key) => saveSettings({ features: { ...toggles, [key]: !toggles[key] } });

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
          {settingsSections.filter((s) => !s.hidden).map((s) => (
            <li key={s.name}>
              <button
                onClick={() => setActive(s.name)}
                className={[
                  'w-full text-left px-5 py-4 text-sm border-b border-slate-50 transition',
                  active === s.name ? 'text-mun-700 font-semibold bg-mun-50' : 'text-ink-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: active section */}
      <div className="bg-white rounded-md border border-slate-200 shadow-soft p-6">
        {active === 'Features' && (
          <>
            <h2 className="text-2xl font-semibold text-ink-800 mb-1">Features</h2>
            <p className="text-sm text-ink-400 mb-6">Turn features on or off for your Munchies point of sale.</p>
            <ul className="divide-y divide-slate-100">
              {featureToggles.map((f) => (
                <li key={f.key} className="flex items-start gap-4 py-5">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-ink-800">{f.label}</div>
                    <div className="text-sm text-ink-400 mt-0.5">
                      {f.desc} <span className="text-mun-600 font-medium cursor-pointer">Learn more</span>
                    </div>
                  </div>
                  <Toggle on={toggles[f.key]} onChange={() => flip(f.key)} />
                </li>
              ))}
            </ul>
          </>
        )}
        {active === 'Receipt' && <ReceiptSettings />}
        {active === 'Kitchen printers' && <PrinterSettings />}
        {active === 'Dining options' && <DiningSettings />}
      </div>
    </div>
  );
}

// ---- Receipt ---------------------------------------------------------------
function ReceiptSettings() {
  const { settings, saveSettings } = useMunchies();
  const r = settings?.receipt || {};
  const set = (patch) => saveSettings({ receipt: { ...r, ...patch } });
  const underlineCls = 'w-full border-b border-slate-300 bg-transparent py-2 text-ink-800 focus:outline-none focus:border-mun-500';
  return (
    <>
      <h2 className="text-2xl font-semibold text-ink-800 mb-1">Receipt</h2>
      <p className="text-sm text-ink-400 mb-6">Customise what prints on your customer receipts.</p>
      <div className="space-y-6 max-w-md">
        <div>
          <div className="text-xs text-ink-400 mb-1">Header</div>
          <input value={r.header || ''} onChange={(e) => set({ header: e.target.value })} placeholder="Munchies" className={underlineCls} />
        </div>
        <div>
          <div className="text-xs text-ink-400 mb-1">Footer</div>
          <input value={r.footer || ''} onChange={(e) => set({ footer: e.target.value })} placeholder="Thank you for your visit!" className={underlineCls} />
        </div>
        <Row label="Show logo" on={!!r.showLogo} onChange={(v) => set({ showLogo: v })} />
        <Row label="Show order comments" on={!!r.showComments} onChange={(v) => set({ showComments: v })} />
      </div>
    </>
  );
}

// ---- Kitchen printers ------------------------------------------------------
const PRINTER_MODELS = ['No printer', 'Star TSP654II (Bluetooth)', 'Star TSP143 (LAN)', 'Epson TM-T20 (Bluetooth)', 'Epson TM-m30 (LAN)', 'Generic ESC/POS'];
function PrinterSettings() {
  const { settings, saveSettings } = useMunchies();
  const printers = settings?.printers || [];
  const add = () => saveSettings({ printers: [...printers, { name: 'Kitchen printer', model: 'No printer' }] });
  const upd = (i, patch) => saveSettings({ printers: printers.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
  const del = (i) => saveSettings({ printers: printers.filter((_, idx) => idx !== i) });
  return (
    <>
      <h2 className="text-2xl font-semibold text-ink-800 mb-1">Kitchen printers</h2>
      <p className="text-sm text-ink-400 mb-6">Send orders to a kitchen printer or display.</p>
      <div className="space-y-4 max-w-lg">
        {printers.map((p, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex-1">
              <div className="text-xs text-ink-400 mb-1">Name</div>
              <input value={p.name} onChange={(e) => upd(i, { name: e.target.value })} className="w-full border-b border-slate-300 bg-transparent py-2 text-ink-800 focus:outline-none focus:border-mun-500" />
            </div>
            <div className="w-56">
              <div className="text-xs text-ink-400 mb-1">Model</div>
              <select value={p.model} onChange={(e) => upd(i, { model: e.target.value })} className="w-full border-b border-slate-300 bg-transparent py-2 text-ink-800 focus:outline-none focus:border-mun-500">
                {PRINTER_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button onClick={() => del(i)} className="text-slate-400 hover:text-rose-500 mb-2"><Trash2 className="w-5 h-5" /></button>
          </div>
        ))}
        {printers.length === 0 && <p className="text-sm text-ink-400">No printers added yet.</p>}
        <button onClick={add} className="flex items-center gap-2 text-mun-600 font-bold text-sm uppercase tracking-wide mt-2">
          <Plus className="w-5 h-5 rounded-full border-2 border-mun-600 p-0.5" /> Add printer
        </button>
      </div>
    </>
  );
}

// ---- Dining options --------------------------------------------------------
function DiningSettings() {
  const { settings, saveSettings } = useMunchies();
  const dining = settings?.dining || [];
  const upd = (i, patch) => saveSettings({ dining: dining.map((d, idx) => (idx === i ? { ...d, ...patch } : d)) });
  const add = () => saveSettings({ dining: [...dining, { name: 'New option', enabled: true }] });
  const del = (i) => saveSettings({ dining: dining.filter((_, idx) => idx !== i) });
  return (
    <>
      <h2 className="text-2xl font-semibold text-ink-800 mb-1">Dining options</h2>
      <p className="text-sm text-ink-400 mb-6">Mark orders as dine in, takeout or for delivery.</p>
      <ul className="divide-y divide-slate-100 max-w-lg">
        {dining.map((d, i) => (
          <li key={i} className="flex items-center gap-4 py-4">
            <input value={d.name} onChange={(e) => upd(i, { name: e.target.value })} className="flex-1 border-b border-slate-200 bg-transparent py-1 text-ink-800 focus:outline-none focus:border-mun-500" />
            <Toggle on={!!d.enabled} onChange={(v) => upd(i, { enabled: v })} />
            <button onClick={() => del(i)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
          </li>
        ))}
      </ul>
      <button onClick={add} className="flex items-center gap-2 text-mun-600 font-bold text-sm uppercase tracking-wide mt-4">
        <Plus className="w-5 h-5 rounded-full border-2 border-mun-600 p-0.5" /> Add option
      </button>
    </>
  );
}

function Row({ label, on, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-ink-800">{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}
