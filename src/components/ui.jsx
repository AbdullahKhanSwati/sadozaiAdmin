// Shared light-weight UI primitives used across all pages.

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, trend, accent = 'brand' }) {
  const palette = {
    brand:   { bg: 'bg-brand-50',    fg: 'text-brand-600',   ring: 'ring-brand-100' },
    emerald: { bg: 'bg-emerald-50',  fg: 'text-emerald-600', ring: 'ring-emerald-100' },
    blue:    { bg: 'bg-blue-50',     fg: 'text-blue-600',    ring: 'ring-blue-100' },
    amber:   { bg: 'bg-amber-50',    fg: 'text-amber-600',   ring: 'ring-amber-100' },
    rose:    { bg: 'bg-rose-50',     fg: 'text-rose-600',    ring: 'ring-rose-100' },
    indigo:  { bg: 'bg-indigo-50',   fg: 'text-indigo-600',  ring: 'ring-indigo-100' },
    slate:   { bg: 'bg-slate-100',   fg: 'text-slate-600',   ring: 'ring-slate-200' },
  }[accent] || { bg: 'bg-brand-50', fg: 'text-brand-600', ring: 'ring-brand-100' };

  const trendUp = trend && trend.startsWith('+');
  return (
    <div className="card card-hover p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl ${palette.bg} ${palette.fg} flex items-center justify-center ring-1 ${palette.ring}`}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-widest font-bold text-ink-400">{label}</div>
        <div className="mt-1 text-2xl font-extrabold tracking-tight truncate">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {sub && <span className="text-xs text-ink-500">{sub}</span>}
          {trend && (
            <span
              className={[
                'text-[11px] font-bold px-1.5 py-0.5 rounded-md',
                trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
              ].join(' ')}
            >
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ value, map }) {
  const m = map || defaultStatusMap;
  const cfg = m[value] || { tone: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`chip ${cfg.tone}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {value}
    </span>
  );
}

const defaultStatusMap = {
  Active:        { tone: 'bg-emerald-50 text-emerald-700' },
  Available:     { tone: 'bg-emerald-50 text-emerald-700' },
  Occupied:      { tone: 'bg-amber-50 text-amber-700' },
  Maintenance:   { tone: 'bg-rose-50 text-rose-700' },
  Expired:       { tone: 'bg-rose-50 text-rose-700' },
  Completed:     { tone: 'bg-slate-100 text-slate-600' },
  Upcoming:      { tone: 'bg-blue-50 text-blue-700' },
  Cancelled:     { tone: 'bg-rose-50 text-rose-700' },
  'On Leave':    { tone: 'bg-amber-50 text-amber-700' },
  'In Progress': { tone: 'bg-blue-50 text-blue-700' },
};

export function TierBadge({ tier }) {
  const map = {
    Premium:  'bg-violet-100 text-violet-700 ring-violet-200',
    Standard: 'bg-blue-100 text-blue-700 ring-blue-200',
    Basic:    'bg-slate-100 text-slate-600 ring-slate-200',
  };
  return (
    <span className={`chip ring-1 ${map[tier] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {tier}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, message, cta }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-ink-400 flex items-center justify-center mb-3">
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="font-extrabold text-lg">{title}</div>
      {message && <p className="text-sm text-ink-500 mt-1 max-w-md">{message}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

export function Tabs({ value, onChange, items }) {
  return (
    <div className="inline-flex bg-slate-100 p-1 rounded-xl">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={[
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition',
              active ? 'bg-white text-ink-800 shadow-soft' : 'text-ink-500 hover:text-ink-700',
            ].join(' ')}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

// From/To date-range picker. Empty values mean "no bound" on that side.
export function DateRange({ from, to, onFrom, onTo, onClear }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
        <span className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">From</span>
        <input
          type="date"
          value={from || ''}
          max={to || undefined}
          onChange={(e) => onFrom(e.target.value)}
          className="bg-transparent border-0 outline-none text-sm font-semibold cursor-pointer"
        />
      </div>
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5">
        <span className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">To</span>
        <input
          type="date"
          value={to || ''}
          min={from || undefined}
          onChange={(e) => onTo(e.target.value)}
          className="bg-transparent border-0 outline-none text-sm font-semibold cursor-pointer"
        />
      </div>
      {(from || to) && onClear && (
        <button onClick={onClear} className="btn-ghost px-2.5 py-1.5 text-xs" title="Clear date range (show all)">
          Clear
        </button>
      )}
    </div>
  );
}

export function FilterChips({ value, onChange, items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
              active
                ? 'bg-ink-900 text-white border-ink-900'
                : 'bg-white text-ink-600 border-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {it.label}
            {typeof it.count === 'number' && (
              <span className={['ml-1.5 text-[10px] font-bold', active ? 'text-white/80' : 'text-ink-400'].join(' ')}>
                {it.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
