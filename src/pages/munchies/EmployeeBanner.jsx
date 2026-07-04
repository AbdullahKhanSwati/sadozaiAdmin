import { useState } from 'react';
import { Contact } from 'lucide-react';
import { TextBtn } from './catalogUi.jsx';

const KEY = 'munchies.empBanner.dismissed';

// Dismissible "employee management subscription" promo, shown on both
// Employee list and Access rights (matches the Loyverse screenshots).
export default function EmployeeBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  if (dismissed) return null;

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <div className="bg-white rounded-md border border-slate-200 shadow-soft p-5 mb-4 flex gap-4">
      <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
        <Contact className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <p className="text-sm text-ink-600 leading-relaxed">
          Empower your business with employee management subscription — manage access rights, track
          timecards and sales by employee. Start your 14-day free trial by adding your first employee.
        </p>
        <div className="flex justify-end gap-6 mt-3">
          <TextBtn tone="mun">Learn more</TextBtn>
          <TextBtn tone="mun" onClick={dismiss}>Got it</TextBtn>
        </div>
      </div>
    </div>
  );
}
