// Small helpers shared by the Farm-only pages (Livestock, Production, Expenses).
import { X } from 'lucide-react';

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const monthStart = () => `${today().slice(0, 7)}-01`;

// On-screen date (readable) and the Excel-friendly dd/mm/yyyy used in exports.
export const fmtDate = (iso) =>
  iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const exportDate = (iso) =>
  iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB') : '';

// "2y 3m" / "5m" / "12d" from a birth date.
export function ageLabel(birthIso) {
  if (!birthIso) return '—';
  const b = new Date(`${birthIso}T00:00:00`);
  const n = new Date();
  let months = (n.getFullYear() - b.getFullYear()) * 12 + (n.getMonth() - b.getMonth());
  if (n.getDate() < b.getDate()) months -= 1;
  if (months < 0) return '—';
  if (months === 0) return `${Math.max(0, Math.floor((n - b) / 86400000))}d`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y ? `${y}y${m ? ` ${m}m` : ''}` : `${m}m`;
}

export const qtyFmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

export const STATUSES = [
  { value: 'active', label: 'Active', tone: 'bg-emerald-50 text-emerald-700' },
  { value: 'sold', label: 'Sold', tone: 'bg-amber-50 text-amber-700' },
  { value: 'dead', label: 'Dead', tone: 'bg-slate-100 text-slate-500' },
];
export const statusOf = (v) => STATUSES.find((s) => s.value === (v || 'active')) || STATUSES[0];

export const GENDERS = [
  { value: '', label: 'Not set' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
];

export const SHIFTS = [
  { value: '', label: 'Whole day' },
  { value: 'Morning', label: 'Morning' },
  { value: 'Evening', label: 'Evening' },
];

export const UNITS = ['Litre', 'Kg', 'Pieces', 'Dozen'];

export const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-bf-500';

export function Label({ children }) {
  return <label className="block text-xs text-ink-400 mb-1">{children}</label>;
}

export function Modal({ title, onClose, children, footer, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div
        className={['bg-white rounded-lg shadow-2xl w-full max-h-[90vh] flex flex-col', wide ? 'max-w-3xl' : 'max-w-md'].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="text-lg font-bold text-ink-800">{title}</div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export function StatTile({ label, value, sub, tone = 'text-ink-800' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 min-w-0">
      <div className="text-[11px] uppercase tracking-widest font-bold text-ink-400 truncate">{label}</div>
      <div className={['text-xl font-bold mt-1 truncate', tone].join(' ')}>{value}</div>
      {sub ? <div className="text-xs text-ink-400 mt-0.5 truncate">{sub}</div> : null}
    </div>
  );
}
