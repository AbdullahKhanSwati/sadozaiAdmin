import { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { featureToggles, settingsSections } from '../../data/munchiesData.js';

function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-11 h-6 rounded-full transition-colors relative shrink-0',
        on ? 'bg-mun-500' : 'bg-slate-300',
      ].join(' ')}
      role="switch"
      aria-checked={on}
    >
      <span
        className={[
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
          on ? 'translate-x-[22px]' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

export default function MunchiesSettings() {
  const [active, setActive] = useState('Features');
  const [toggles, setToggles] = useState(
    () => Object.fromEntries(featureToggles.map((f) => [f.key, f.on]))
  );

  const flip = (key) => setToggles((t) => ({ ...t, [key]: !t[key] }));

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
          {settingsSections.map((s) => (
            <li key={s}>
              <button
                onClick={() => setActive(s)}
                className={[
                  'w-full text-left px-5 py-4 text-sm border-b border-slate-50 transition',
                  active === s ? 'text-mun-700 font-semibold bg-mun-50' : 'text-ink-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: Features */}
      <div className="bg-white rounded-md border border-slate-200 shadow-soft p-6">
        {active === 'Features' ? (
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
                  <Toggle on={toggles[f.key]} onClick={() => flip(f.key)} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-mun-50 text-mun-600 flex items-center justify-center mb-3">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div className="text-lg font-semibold text-ink-800">{active}</div>
            <p className="text-sm text-ink-400 mt-1 max-w-sm">This settings section is coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
