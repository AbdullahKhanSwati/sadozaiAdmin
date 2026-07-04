// Shared UI bits for the Munchies (Loyverse-style) report pages.
import { useState } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, Clock, User, Columns3, ChevronDown, Check,
} from 'lucide-react';
import { REPORT_PERIOD } from '../../data/munchiesData.js';

// Hour options 00:00 … 23:00 for the custom-period selects.
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

// ---- Generic dropdown shell (backdrop closes on outside click) -----------
function Dropdown({ open, setOpen, button, children, width = 'w-64', align = 'left' }) {
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 text-sm font-semibold text-ink-700 shadow-soft hover:bg-slate-50"
      >
        {button}
      </button>
      {open && (
        <div
          className={[
            'absolute z-20 mt-1 bg-white rounded-md border border-slate-200 shadow-pop py-1 animate-fade-in',
            width,
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ---- Date navigator (static range with ‹ › arrows) -----------------------
function DateNav() {
  return (
    <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden shadow-soft">
      <button className="px-2.5 py-2 hover:bg-slate-50 text-ink-500 border-r border-slate-200">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-ink-700">
        <Calendar className="w-4 h-4 text-ink-400" />
        {REPORT_PERIOD.label}
      </div>
      <button className="px-2.5 py-2 hover:bg-slate-50 text-ink-500 border-l border-slate-200">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---- Time filter: All day / Custom period --------------------------------
function TimeFilter() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('custom'); // 'all' | 'custom'
  const [start, setStart] = useState('00:00');
  const [end, setEnd] = useState('23:00');

  const label = mode === 'all' ? 'All day' : `${start} - ${end}`;

  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-72"
      button={<><Clock className="w-4 h-4 text-ink-400" />{label}<ChevronDown className="w-4 h-4 text-ink-400" /></>}
    >
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
        <Radio checked={mode === 'all'} onChange={() => setMode('all')} />
        <span className="text-sm text-ink-700">All day</span>
      </label>
      <div className="border-t border-slate-100" />
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
        <Radio checked={mode === 'custom'} onChange={() => setMode('custom')} />
        <span className="text-sm text-ink-700">Custom period</span>
      </label>
      {mode === 'custom' && (
        <div className="grid grid-cols-2 gap-4 px-4 pb-4 pt-1">
          <TimeSelect label="Start" value={start} onChange={setStart} />
          <TimeSelect label="End" value={end} onChange={setEnd} />
        </div>
      )}
    </Dropdown>
  );
}

function TimeSelect({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-b border-slate-300 bg-transparent py-1 text-sm text-ink-800 focus:outline-none focus:border-mun-500"
      >
        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
}

function Radio({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange} className="shrink-0">
      <span className={['w-5 h-5 rounded-full border-2 flex items-center justify-center', checked ? 'border-mun-500' : 'border-slate-300'].join(' ')}>
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-mun-500" />}
      </span>
    </button>
  );
}

// ---- Employee filter: checkbox list --------------------------------------
function EmployeeFilter() {
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState(true);
  const all = owner; // only one employee (Owner) in this dataset

  const label = all ? 'All employees' : owner ? 'Owner' : 'No employees';

  const toggleAll = () => setOwner((v) => !v);

  return (
    <Dropdown
      open={open}
      setOpen={setOpen}
      width="w-60"
      button={<><User className="w-4 h-4 text-ink-400" />{label}<ChevronDown className="w-4 h-4 text-ink-400" /></>}
    >
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100">
        <Checkbox checked={all} onChange={toggleAll} />
        <span className="text-sm text-ink-700">All employees</span>
      </label>
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50">
        <Checkbox checked={owner} onChange={() => setOwner((v) => !v)} />
        <span className="text-sm text-ink-700">Owner</span>
      </label>
    </Dropdown>
  );
}

function Checkbox({ checked, onChange }) {
  return (
    <button type="button" onClick={onChange} className="shrink-0">
      <span className={['w-5 h-5 rounded flex items-center justify-center border-2', checked ? 'bg-mun-500 border-mun-500' : 'border-slate-300'].join(' ')}>
        {checked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
      </span>
    </button>
  );
}

// ---- Small chart-config select (Area/Line/Bar, Days/Weeks …) -------------
export function ChartSelect({ value, options, onChange, width = 'w-40' }) {
  const [open, setOpen] = useState(false);
  // options: array of string | { value, disabled }
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, disabled: false } : o));
  return (
    <div className="relative">
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between gap-2 border-b border-slate-300 pb-1 text-sm font-medium text-ink-700 min-w-[110px] hover:border-mun-500"
      >
        {value}
        <ChevronDown className="w-4 h-4 text-ink-400" />
      </button>
      {open && (
        <div className={['absolute right-0 z-20 mt-1 bg-white rounded-md border border-slate-200 shadow-pop py-1 animate-fade-in', width].join(' ')}>
          {norm.map((o) => (
            <button
              key={o.value}
              type="button"
              disabled={o.disabled}
              onClick={() => { if (!o.disabled) { onChange(o.value); setOpen(false); } }}
              className={[
                'block w-full text-left px-4 py-2.5 text-sm transition',
                o.disabled
                  ? 'text-slate-300 cursor-not-allowed'
                  : value === o.value
                    ? 'bg-slate-100 text-ink-800 font-semibold'
                    : 'text-ink-600 hover:bg-slate-50',
              ].join(' ')}
            >
              {o.value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Toolbar (date + time + employee) ------------------------------------
export function ReportToolbar({ children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <DateNav />
      <TimeFilter />
      <EmployeeFilter />
      {children}
    </div>
  );
}

// ---- Layout helpers ------------------------------------------------------
export function Panel({ children, className = '' }) {
  return (
    <div className={['bg-white rounded-md border border-slate-200 shadow-soft', className].join(' ')}>
      {children}
    </div>
  );
}

export function ExportBar({ children }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <button className="text-sm font-bold tracking-wide text-ink-600 hover:text-mun-600">EXPORT</button>
      <div className="flex items-center gap-3">
        {children}
        <button className="text-ink-400 hover:text-ink-600" title="Columns">
          <Columns3 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function Trend({ value }) {
  if (value === 0 || value == null) return null;
  const up = value > 0;
  return <span className={up ? 'text-mun-600' : 'text-rose-500'}>{up ? '+' : ''}{value.toFixed(2)}%</span>;
}

// ---- Pagination ----------------------------------------------------------
// Slices `items` into pages; returns the current page's items + controls.
export function usePagination(items, initial = 10) {
  const [rowsPerPage, setRows] = useState(initial);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / rowsPerPage));
  const current = Math.min(page, pageCount);
  const pageItems = items.slice((current - 1) * rowsPerPage, current * rowsPerPage);
  const setRowsPerPage = (n) => { setRows(n); setPage(1); };
  return { page: current, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems };
}

export function TablePagination({ page, pageCount, rowsPerPage, setPage, setRowsPerPage, rowsOptions = [10, 25, 50] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 border-t border-slate-100 text-sm text-ink-500">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="w-9 h-9 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPage(page + 1)}
          disabled={page >= pageCount}
          className="w-9 h-9 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div>
        Page:
        <span className="inline-block min-w-[34px] text-center border border-slate-200 rounded px-2 py-1 mx-2 text-ink-700 font-medium">{page}</span>
        of {pageCount}
      </div>
      {setRowsPerPage && (
        <div className="flex items-center gap-2">
          Rows per page:
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
            className="border-b border-slate-300 bg-transparent py-1 text-ink-700 font-medium focus:outline-none focus:border-mun-500 cursor-pointer"
          >
            {rowsOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}
