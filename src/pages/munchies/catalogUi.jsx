// Shared building blocks for the Munchies Items (catalog) screens.
import { Check } from 'lucide-react';
import { POS_COLORS, POS_SHAPES } from '../../data/munchiesCatalog.js';

// ---- Buttons -------------------------------------------------------------
export function PrimaryBtn({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={['px-5 py-2.5 rounded bg-mun-500 text-white text-sm font-bold uppercase tracking-wide shadow-sm hover:bg-mun-600 transition disabled:opacity-50', className].join(' ')}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={['px-5 py-2.5 rounded bg-white border border-slate-200 text-ink-700 text-sm font-bold uppercase tracking-wide hover:bg-slate-50 transition', className].join(' ')}
    >
      {children}
    </button>
  );
}

export function TextBtn({ children, tone = 'ink', className = '', ...props }) {
  const tones = { ink: 'text-ink-600 hover:text-ink-800', mun: 'text-mun-600 hover:text-mun-700' };
  return (
    <button {...props} className={['text-sm font-bold uppercase tracking-wide transition', tones[tone], className].join(' ')}>
      {children}
    </button>
  );
}

// ---- Toggle switch -------------------------------------------------------
export function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={['w-11 h-6 rounded-full transition-colors relative shrink-0', on ? 'bg-mun-500' : 'bg-slate-300'].join(' ')}
    >
      <span className={['absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', on ? 'translate-x-[22px]' : 'translate-x-0.5'].join(' ')} />
    </button>
  );
}

// ---- Table checkbox ------------------------------------------------------
export function CheckBox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={['w-5 h-5 rounded flex items-center justify-center border-2 transition', checked ? 'bg-mun-500 border-mun-500' : 'border-slate-300 hover:border-slate-400'].join(' ')}
    >
      {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
    </button>
  );
}

// ---- Cards & fields ------------------------------------------------------
export function Card({ children, className = '' }) {
  return <div className={['bg-white rounded-md border border-slate-200 shadow-soft', className].join(' ')}>{children}</div>;
}

// Underlined "material" text field (label floats above).
export function Field({ label, hint, children }) {
  return (
    <div>
      {label && <div className="text-xs text-ink-400 mb-1">{label}</div>}
      {children}
      {hint && <div className="text-xs text-ink-400 mt-1">{hint}</div>}
    </div>
  );
}

export const underline =
  'w-full border-b border-slate-300 bg-transparent py-2 text-ink-800 placeholder:text-slate-400 focus:outline-none focus:border-mun-500 transition';

// ---- Radio ---------------------------------------------------------------
export function Radio({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={onChange}>
      <span className={['w-5 h-5 rounded-full border-2 flex items-center justify-center', checked ? 'border-mun-500' : 'border-slate-300'].join(' ')}>
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-mun-500" />}
      </span>
      <span className="text-sm text-ink-700">{label}</span>
    </label>
  );
}

// ---- POS representation pickers ------------------------------------------
export function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {POS_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-16 h-16 rounded-md flex items-center justify-center shadow-sm"
          style={{ backgroundColor: c }}
        >
          {value === c && <Check className="w-6 h-6 text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

export function ShapePicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-3">
      {POS_SHAPES.map((s) => {
        const on = value === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="w-14 h-14 flex items-center justify-center"
            title={s}
          >
            <span className={['w-11 h-11 border-2 flex items-center justify-center text-ink-500', shapeClass(s)].join(' ')} style={shapeStyle(s)}>
              {on && <Check className="w-5 h-5" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function shapeClass(s) {
  if (s === 'square') return 'border-slate-400 rounded-md';
  if (s === 'circle') return 'border-slate-400 rounded-full';
  if (s === 'scalloped') return 'border-slate-400 border-dashed rounded-full';
  return 'border-slate-400'; // hexagon handled via clip-path
}

function shapeStyle(s) {
  if (s === 'hexagon') return { clipPath: 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)' };
  return undefined;
}

// Small coloured POS tile preview (used on list rows / forms).
export function PosTile({ color, shape, size = 40, label }) {
  const style = { backgroundColor: color, width: size, height: size };
  if (shape === 'circle' || shape === 'scalloped') style.borderRadius = '9999px';
  else if (shape === 'hexagon') style.clipPath = 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)';
  else style.borderRadius = '6px';
  return (
    <span className="flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={style}>
      {label}
    </span>
  );
}
