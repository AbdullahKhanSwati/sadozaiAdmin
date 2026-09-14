import { useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Plus, Receipt, RefreshCw, Search, Tags, Trash2, TrendingDown, Wallet, X } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { supabaseMunchies as sb } from '../../lib/supabaseMunchies.js';
import { rs } from '../../data/munchiesData.js';
import { downloadCsv, csvDate } from '../../lib/csv.js';
import { compareNatural } from '../../lib/naturalSort.js';
import { DateRange, EmptyState, FilterChips, PageHeader, StatCard } from '../../components/ui.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { defaultRange } from './munchiesUi.jsx';
import MunchiesExpenseCategoriesDialog from '../../components/dialogs/MunchiesExpenseCategoriesDialog.jsx';

// Same layout as the Shots admin's Expenses page: period picker, KPI cards,
// search + category chips, the list with a running total and a category
// breakdown — on top of the Munchies data (DB-backed rows shared with the app).

const COLORS = ['#43A047', '#F4B860', '#3B82F6', '#E53E3E', '#A855F7', '#FF6B6B', '#64748B', '#0EA5E9', '#10B981', '#F97316'];

const today = () => new Date().toISOString().slice(0, 10);
// On-screen date — readable. Excel-friendly dd/mm/yyyy is used for the export.
const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' }) : '—';
const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
const exportDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB') : ''; // dd/mm/yyyy

const rangeLabel = (from, to) => {
  const mtd = defaultRange();
  if (!from && !to) return 'All time';
  if (from === mtd.start && to === mtd.end) return 'Month to date';
  return `${from ? fmtDate(from) : '…'} → ${to ? fmtDate(to) : '…'}`;
};

const EMPTY = { id: null, spent_on: today(), category: '', amount: '', description: '' };

export default function Expenses() {
  const { expenses: rows, expenseCategories, reloadExpenses } = useMunchies();
  const [loading, setLoading] = useState(false);
  // Month to date by default (like the Summary page); clear to see everything.
  const [{ from, to }, setRange] = useState(() => {
    const r = defaultRange();
    return { from: r.start, to: r.end };
  });
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);          // null = closed, else EMPTY or an existing row
  const [saving, setSaving] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);

  const timeframeLabel = rangeLabel(from, to);
  const isMtd = from === defaultRange().start && to === defaultRange().end;

  // Category names in menu order ("1 Meat, 2.2 Gas, 10 Misc, Ingredients …").
  const categoryNames = useMemo(() => expenseCategories.map((c) => c.name), [expenseCategories]);

  const load = async () => { setLoading(true); await reloadExpenses(); setLoading(false); };
  useEffect(() => { reloadExpenses(); }, [reloadExpenses]);

  // Everything in the period (drives the cards + the pie).
  const inPeriod = useMemo(() => rows.filter((e) => {
    const d = e.spent_on || '';
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }), [rows, from, to]);

  // The list: period + category chip + search.
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inPeriod
      .filter((e) => (cat === 'All' || (e.category || '') === cat)
        && (!q || (e.description || '').toLowerCase().includes(q) || (e.category || '').toLowerCase().includes(q)))
      .sort((a, b) => (b.spent_on || '').localeCompare(a.spent_on || '') || String(b.created_at || '').localeCompare(String(a.created_at || '')));
  }, [inPeriod, cat, query]);

  const periodTotal = inPeriod.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const listTotal = list.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const byCat = useMemo(() => {
    const map = new Map();
    inPeriod.forEach((e) => {
      const k = e.category || 'Other';
      map.set(k, (map.get(k) || 0) + (Number(e.amount) || 0));
    });
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [inPeriod]);
  const biggest = byCat[0];

  // Chips: every managed category (menu order) + any category text that only
  // exists on old expenses, so nothing is hidden.
  const chipNames = useMemo(() => {
    const extra = [...new Set(inPeriod.map((e) => e.category || 'Other'))].filter((n) => !categoryNames.includes(n)).sort(compareNatural);
    return [...categoryNames, ...extra];
  }, [categoryNames, inPeriod]);
  const FILTERS = [
    { value: 'All', label: 'All', count: inPeriod.length },
    ...chipNames.map((c) => ({ value: c, label: c, count: inPeriod.filter((e) => (e.category || 'Other') === c).length })),
  ];

  const openNew = () => setForm({ ...EMPTY, spent_on: today(), category: categoryNames[0] || 'Other' });
  const openEdit = (e) => setForm({
    id: e.id, spent_on: e.spent_on || today(), category: e.category || categoryNames[0] || 'Other',
    amount: String(e.amount ?? ''), description: e.description || '',
  });

  const save = async () => {
    if (!form.amount || !String(form.description).trim()) return window.alert('Amount and description are required.');
    setSaving(true);
    const payload = {
      spent_on: form.spent_on || today(),
      category: form.category || 'Other',
      amount: Number(form.amount) || 0,
      description: form.description.trim(),
    };
    let error;
    if (form.id) ({ error } = await sb.from('expenses').update(payload).eq('id', form.id));
    else ({ error } = await sb.from('expenses').insert(payload));
    setSaving(false);
    if (error) return window.alert(error.message);
    setForm(null);
    load();
  };

  const del = async (e) => {
    if (!window.confirm(`Delete "${e.description}"?`)) return;
    await sb.from('expenses').delete().eq('id', e.id);
    load();
  };

  // Exports what is listed on screen (period + chip + search).
  const onExport = () => downloadCsv(`munchies-expenses-${csvDate()}.csv`, [
    { label: 'Date', value: (e) => exportDate(e.spent_on) },
    { label: 'Time', value: (e) => fmtTime(e.created_at) },
    { label: 'Category', value: 'category' },
    { label: 'Amount', value: (e) => Number(e.amount) || 0 },
    { label: 'Description', value: 'description' },
  ], list);

  // The category the form is editing might have been deleted from the list —
  // keep showing it so saving doesn't silently change it.
  const formCategoryOptions = form && form.category && !categoryNames.includes(form.category)
    ? [form.category, ...categoryNames]
    : categoryNames;

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Expenses"
        subtitle="Log every cost — ingredients, salaries, rent, utilities — and see where the money goes. Shared with the Munchies app."
        actions={
          <>
            <DateRange
              from={from}
              to={to}
              onFrom={(v) => setRange((r) => ({ ...r, from: v }))}
              onTo={(v) => setRange((r) => ({ ...r, to: v }))}
              onClear={() => setRange({ from: '', to: '' })}
            />
            {!isMtd && (
              <button onClick={() => setRange({ from: defaultRange().start, to: defaultRange().end })} className="btn-ghost px-3" title="Back to the current month">
                Month to date
              </button>
            )}
            <button onClick={load} className="btn-ghost" title="Reload"><RefreshCw className={['w-4 h-4', loading ? 'animate-spin' : ''].join(' ')} /></button>
            <button onClick={() => setCatsOpen(true)} className="btn-ghost"><Tags className="w-4 h-4" /> Manage categories</button>
            <button onClick={onExport} disabled={!list.length} className="btn-ghost"><Download className="w-4 h-4" /> Export</button>
            <button onClick={openNew} className="btn bg-mun-600 text-white hover:bg-mun-700 shadow-sm"><Plus className="w-4 h-4" /> Add expense</button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingDown} label={`Total · ${timeframeLabel}`} value={rs(periodTotal)} sub={`${inPeriod.length} entr${inPeriod.length === 1 ? 'y' : 'ies'}`} accent="rose" />
        <StatCard icon={Receipt} label="Entries" value={inPeriod.length} sub={timeframeLabel} accent="emerald" />
        <StatCard icon={Wallet} label="Biggest category" value={biggest?.category || '—'} sub={biggest ? rs(biggest.amount) : ''} accent="amber" />
        <StatCard icon={Receipt} label="Avg / entry" value={rs(inPeriod.length ? Math.round(periodTotal / inPeriod.length) : 0)} accent="slate" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 xl:col-span-2">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                placeholder="Search by description or category…"
                className="input pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <FilterChips value={cat} onChange={setCat} items={FILTERS} />
          </div>
          {loading && rows.length === 0 ? (
            <div className="p-8 text-center text-ink-400">Loading…</div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={inPeriod.length === 0 ? `No expenses for ${timeframeLabel.toLowerCase()}` : 'No matching expenses'}
              message={inPeriod.length === 0 ? 'Change the period above, or add an expense.' : 'Try a different category or search.'}
            />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Description</th>
                    <th className="table-th text-right">Amount</th>
                    <th className="table-th w-20" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="table-td whitespace-nowrap">
                        <div className="font-semibold text-ink-800">{fmtDate(e.spent_on)}</div>
                        <div className="text-[11px] text-ink-400">{fmtTime(e.created_at)}</div>
                      </td>
                      <td className="table-td">
                        <span className="chip bg-rose-50 text-rose-700">{e.category || 'Other'}</span>
                      </td>
                      <td className="table-td text-ink-600">{e.description}</td>
                      <td className="table-td text-right font-extrabold text-rose-600 whitespace-nowrap">− {rs(e.amount)}</td>
                      <td className="table-td">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-slate-400 hover:text-mun-600 hover:bg-slate-100" title="Edit"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => del(e)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 font-bold" colSpan={3}>Total in view ({list.length})</td>
                    <td className="px-4 py-3 text-right font-extrabold text-rose-600 whitespace-nowrap">− {rs(listTotal)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-2">
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Breakdown · {timeframeLabel}</div>
            <h3 className="text-lg font-extrabold mt-0.5 text-ink-800">Expenses by category</h3>
          </div>
          {byCat.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-ink-400">Nothing to show yet.</div>
          ) : (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCat} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={80} paddingAngle={2}>
                    {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
                    formatter={(v) => rs(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-1.5 mt-2">
            {byCat.map((c, i) => (
              <button
                key={c.category}
                type="button"
                onClick={() => setCat(cat === c.category ? 'All' : c.category)}
                className={['w-full flex items-center gap-2 text-xs rounded-md px-1 py-0.5 hover:bg-slate-50', cat === c.category ? 'bg-slate-100' : ''].join(' ')}
                title="Filter the list by this category"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-semibold text-ink-600 truncate">{c.category}</span>
                <span className="ml-auto text-ink-500 whitespace-nowrap">{rs(c.amount)}</span>
                <span className="text-ink-400 w-10 text-right">{periodTotal ? `${Math.round((c.amount / periodTotal) * 100)}%` : ''}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add / edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={() => setForm(null)}>
          <div className="bg-white rounded-3xl shadow-pop w-full max-w-lg p-6 animate-slide-up" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">{form.id ? 'Edit expense' : 'Add expense'}</div>
                <h3 className="text-xl font-extrabold text-ink-800">{form.id ? 'Update this expense' : 'Record a new expense'}</h3>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setForm(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Description</label>
                <input className="input" placeholder="What was this expense for?" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="label">Category</label>
                  <button onClick={() => setCatsOpen(true)} className="text-xs font-semibold text-mun-600 hover:text-mun-700 mb-1.5">Manage</button>
                </div>
                <select className="input" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {formCategoryOptions.length === 0 && <option value="">No categories — add one first</option>}
                  {formCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount (Rs)</label>
                <input className="input" inputMode="decimal" placeholder="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') }))} />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={form.spent_on} onChange={(e) => setForm((f) => ({ ...f, spent_on: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setForm(null)} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="btn bg-mun-600 text-white hover:bg-mun-700 shadow-sm">
                <Plus className="w-4 h-4" /> {saving ? 'Saving…' : 'Save expense'}
              </button>
            </div>
          </div>
        </div>
      )}

      <MunchiesExpenseCategoriesDialog open={catsOpen} onClose={() => setCatsOpen(false)} />
    </div>
  );
}
