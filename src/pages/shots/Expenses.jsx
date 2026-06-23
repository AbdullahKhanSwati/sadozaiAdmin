import { useMemo, useState } from 'react';
import { Plus, Receipt, Search, Tags, TrendingDown, X } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { rupees, inRangePred, rangeLabel, defaultRange } from '../../data/shotsData.js';
import { DateRange, FilterChips, PageHeader, StatCard, EmptyState } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import ExpenseCategoriesDialog from '../../components/dialogs/ExpenseCategoriesDialog.jsx';

const COLORS = ['#E53E3E', '#F4B860', '#3B82F6', '#10B981', '#A855F7', '#FF6B6B', '#64748B', '#0EA5E9'];

export default function Expenses() {
  const { finance, addFinanceEntry, expenseCategories } = useShots();
  const [cat, setCat] = useState('All');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [{ from, to }, setRange] = useState(() => defaultRange());
  const timeframeLabel = rangeLabel(from, to);

  const categoryNames = expenseCategories.map((c) => c.name);
  const expenses = useMemo(() => {
    const inRange = inRangePred(from, to);
    return finance.filter((f) => f.type === 'Out' && inRange(f.date));
  }, [finance, from, to]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses
      .filter((e) => (cat === 'All' || e.category === cat) && (!q || e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [expenses, cat, query]);

  const total = list.reduce((s, e) => s + e.amount, 0);
  const byCat = useMemo(() => {
    const map = new Map();
    expenses.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount));
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
  }, [expenses]);

  const FILTERS = [{ value: 'All', label: 'All', count: expenses.length }, ...categoryNames.map((c) => ({
    value: c, label: c, count: expenses.filter((e) => e.category === c).length,
  }))];

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Log every cost — repairs, utilities, supplies, salaries — and see where money goes."
        actions={
          <>
            <DateRange
              from={from}
              to={to}
              onFrom={(v) => setRange((r) => ({ ...r, from: v }))}
              onTo={(v) => setRange((r) => ({ ...r, to: v }))}
              onClear={() => setRange({ from: '', to: '' })}
            />
            <button onClick={() => setCatsOpen(true)} className="btn-ghost"><Tags className="w-4 h-4" /> Manage categories</button>
            <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add expense</button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingDown}  label={`Total · ${timeframeLabel}`} value={rupees(expenses.reduce((s, e) => s + e.amount, 0))} sub={`${expenses.length} entries`} accent="rose" />
        <StatCard icon={Receipt}       label="Entries"           value={expenses.length} sub={timeframeLabel} accent="brand" />
        <StatCard icon={Receipt}       label="Biggest category"  value={biggestCategory(byCat)?.category || '—'} sub={biggestCategory(byCat) ? rupees(biggestCategory(byCat).amount) : ''} accent="amber" />
        <StatCard icon={Receipt}       label="Avg / entry"       value={rupees(Math.round(expenses.reduce((s, e) => s + e.amount, 0) / Math.max(expenses.length, 1)))} accent="slate" />
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
          {list.length === 0 ? (
            <EmptyState icon={Receipt} title="No matching expenses" message="Try different filters." />
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Description</th>
                    <th className="table-th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/60">
                      <td className="table-td">
                        <div className="font-semibold">{new Date(e.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="text-[11px] text-ink-400">{e.time}</div>
                      </td>
                      <td className="table-td">
                        <span className="chip bg-rose-50 text-rose-700">{e.category}</span>
                      </td>
                      <td className="table-td text-ink-600">{e.description}</td>
                      <td className="table-td text-right font-extrabold text-rose-600">− {rupees(e.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="px-4 py-3 font-bold" colSpan={3}>Total in view</td>
                    <td className="px-4 py-3 text-right font-extrabold text-rose-600">− {rupees(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-2">
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Breakdown</div>
            <h3 className="text-lg font-extrabold mt-0.5">Expenses by category</h3>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCat} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={80} paddingAngle={2}>
                  {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
                  formatter={(v) => rupees(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {byCat.sort((a, b) => b.amount - a.amount).map((c, i) => (
              <div key={c.category} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="font-semibold text-ink-600 truncate">{c.category}</span>
                <span className="ml-auto text-ink-500">{rupees(c.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {addOpen && <AddExpenseModal categories={categoryNames} onClose={() => setAddOpen(false)} onSave={(data) => { addFinanceEntry({ ...data, type: 'Out' }); setAddOpen(false); }} />}
      <ExpenseCategoriesDialog open={catsOpen} onClose={() => setCatsOpen(false)} />
    </>
  );
}

function biggestCategory(arr) {
  return [...arr].sort((a, b) => b.amount - a.amount)[0];
}

function AddExpenseModal({ categories, onClose, onSave }) {
  const [form, setForm] = useState({
    description: '',
    category: categories[0] || '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = () => {
    if (!form.amount || !form.description) return;
    onSave({ ...form, amount: Number(form.amount) });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Add expense</div>
            <h3 className="text-xl font-extrabold">Record a new expense</h3>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-slate-100" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Description</label>
            <input className="input" placeholder="e.g. Felt repair kit — Table 4" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {categories.length === 0 && <option value="">No categories — add some first</option>}
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount (Rs.)</label>
            <input className="input" type="number" placeholder="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
          </div>
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </div>
          <div>
            <label className="label">Time</label>
            <input className="input" type="time" value={form.time} onChange={(e) => set('time', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} className="btn-primary"><Plus className="w-4 h-4" /> Save expense</button>
        </div>
      </div>
    </div>
  );
}
