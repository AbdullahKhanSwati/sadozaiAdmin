import { useMemo, useState } from 'react';
import {
  Download, Plus, Search, TrendingDown, TrendingUp, Wallet, X,
} from 'lucide-react';
import { CartesianGrid, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  dateKey, expenseCategories, getMTDFinance, getMonthFinance, previousMonths, rupees,
} from '../../data/shotsData.js';
import { FilterChips, PageHeader, StatCard, Tabs } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import { downloadCsv, csvDate } from '../../lib/csv.js';

const TYPE_FILTERS = [
  { value: 'All', label: 'All' },
  { value: 'In',  label: 'Income' },
  { value: 'Out', label: 'Expense' },
];

export default function Finance() {
  const { finance, addFinanceEntry } = useShots();
  const months = useMemo(() => previousMonths(12), []);
  const [monthIdx, setMonthIdx] = useState(0);
  const [type, setType] = useState('All');
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const selected = months[monthIdx];

  const items = useMemo(() => {
    const list = selected.isCurrent
      ? getMTDFinance(finance, new Date())
      : getMonthFinance(finance, selected.year, selected.month);
    const q = query.trim().toLowerCase();
    return list.filter((f) => {
      const matchT = type === 'All' || f.type === type;
      const matchQ = !q || f.category.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
      return matchT && matchQ;
    });
  }, [finance, selected, type, query]);

  const income  = items.filter((i) => i.type === 'In').reduce((s, i) => s + i.amount, 0);
  const expense = items.filter((i) => i.type === 'Out').reduce((s, i) => s + i.amount, 0);
  const net = income - expense;

  // Bar chart per category
  const catData = useMemo(() => {
    const map = new Map();
    items.forEach((it) => {
      const key = it.category;
      const cur = map.get(key) || { category: key, income: 0, expense: 0 };
      if (it.type === 'In') cur.income += it.amount;
      else cur.expense += it.amount;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }, [items]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map();
    items.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).forEach((it) => {
      if (!map.has(it.date)) map.set(it.date, []);
      map.get(it.date).push(it);
    });
    return Array.from(map.entries());
  }, [items]);

  const today = dateKey(new Date());

  const exportCsv = () => {
    downloadCsv(`finance-${selected.label.replace(/\s+/g, '-')}-${csvDate()}.csv`, [
      { label: 'Date', value: 'date' },
      { label: 'Time', value: 'time' },
      { label: 'Type', value: (t) => (t.type === 'In' ? 'Income' : 'Expense') },
      { label: 'Category', value: 'category' },
      { label: 'Description', value: 'description' },
      { label: 'Amount (Rs.)', value: 'amount' },
    ], items);
  };

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle={selected.isCurrent ? `${selected.label} · to date` : selected.label}
        actions={
          <>
            <button onClick={exportCsv} className="btn-ghost"><Download className="w-4 h-4" /> Export</button>
            <button onClick={() => setAddOpen(true)} className="btn-primary"><Plus className="w-4 h-4" /> New transaction</button>
          </>
        }
      />

      {/* Month picker */}
      <div className="card p-3 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {months.map((m, i) => {
            const active = i === monthIdx;
            return (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => setMonthIdx(i)}
                className={[
                  'px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition',
                  active ? 'bg-ink-900 text-white shadow-pop' : 'text-ink-600 hover:bg-slate-100',
                ].join(' ')}
              >
                {m.label}{m.isCurrent ? ' · MTD' : ''}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={TrendingUp}   label="Income"   value={rupees(income)}  sub={`${items.filter((i) => i.type === 'In').length} entries`}  accent="emerald" />
        <StatCard icon={TrendingDown} label="Expense"  value={rupees(expense)} sub={`${items.filter((i) => i.type === 'Out').length} entries`} accent="rose" />
        <StatCard icon={Wallet}       label="Net profit" value={rupees(net)}    sub={net >= 0 ? 'In the black' : 'Loss'} accent={net >= 0 ? 'emerald' : 'rose'} />
        <StatCard icon={Wallet}       label="Avg / day"  value={rupees(Math.round((income + expense) / Math.max(grouped.length, 1)))} sub={`${grouped.length} days with activity`} accent="brand" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Categories</div>
            <h3 className="text-lg font-extrabold mt-0.5">Income vs expense by category</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData} margin={{ top: 10, right: 8, left: -10, bottom: 0 }} barGap={4} barCategoryGap="22%">
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="category" stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
                  formatter={(v) => rupees(v)}
                />
                <Bar dataKey="income"  fill="#10B981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" fill="#E53E3E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5 bg-brand-gradient text-white relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-black/15 blur-xl" />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-widest font-bold opacity-80">Net profit</div>
            <div className="text-4xl font-extrabold mt-1">{rupees(net)}</div>
            <div className="text-xs opacity-85 mt-1">{selected.isCurrent ? `${selected.label} · to date` : selected.label}</div>

            <div className="mt-5">
              <div className="h-3 rounded-full bg-white/15 overflow-hidden flex">
                <div className="bg-emerald-400" style={{ width: `${(income / (income + expense || 1)) * 100}%` }} />
                <div className="bg-amber-300" style={{ width: `${(expense / (income + expense || 1)) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs mt-3 font-semibold">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Income {rupees(income)}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-300" /> Expense {rupees(expense)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search by category or description…"
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Tabs value={type} onChange={setType} items={TYPE_FILTERS} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-th">Date · Time</th>
                <th className="table-th">Category</th>
                <th className="table-th">Description</th>
                <th className="table-th">Type</th>
                <th className="table-th text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-sm text-ink-500 py-10">No transactions for this filter.</td></tr>
              ) : (
                grouped.flatMap(([date, list]) => [
                  <tr key={`h-${date}`}>
                    <td colSpan={5} className="px-4 py-2 text-[11px] uppercase tracking-widest font-bold text-ink-400 bg-slate-50">
                      {date === today ? 'Today' : new Date(date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>,
                  ...list.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60">
                      <td className="table-td">
                        <div className="font-semibold">{new Date(tx.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                        <div className="text-[11px] text-ink-400">{tx.time}</div>
                      </td>
                      <td className="table-td font-semibold">{tx.category}</td>
                      <td className="table-td text-ink-600">{tx.description}</td>
                      <td className="table-td">
                        <span className={[
                          'chip',
                          tx.type === 'In' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
                        ].join(' ')}>
                          {tx.type === 'In' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className={['table-td text-right font-extrabold', tx.type === 'In' ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
                        {tx.type === 'In' ? '+' : '−'} {rupees(tx.amount)}
                      </td>
                    </tr>
                  )),
                ])
              )}
            </tbody>
          </table>
        </div>
      </div>

      {addOpen && <TransactionDialog onClose={() => setAddOpen(false)} onSave={(data) => { addFinanceEntry(data); setAddOpen(false); }} />}
    </>
  );
}

function TransactionDialog({ onClose, onSave }) {
  const [form, setForm] = useState({
    type: 'In',
    category: 'Table Rental',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
  });
  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));
  const cats = ['Table Rental', 'Membership', 'Snacks', ...expenseCategories];

  const save = () => {
    if (!form.amount || !form.description) return;
    onSave({ ...form, amount: Number(form.amount) });
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-lg p-6 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">New entry</div>
            <h3 className="text-xl font-extrabold">Record a transaction</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid grid-cols-2 gap-2">
            {['In', 'Out'].map((t) => (
              <button
                key={t}
                onClick={() => set('type', t)}
                className={[
                  'rounded-xl px-3 py-2 text-sm font-bold border transition',
                  form.type === t ? (t === 'In' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-2 ring-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200 ring-2 ring-rose-200') : 'bg-white border-slate-200 text-ink-600',
                ].join(' ')}
              >
                {t === 'In' ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <input className="input" placeholder="What is this for?" value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount (Rs.)</label>
            <input className="input" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
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
          <button onClick={save} className="btn-primary"><Plus className="w-4 h-4" /> Save entry</button>
        </div>
      </div>
    </div>
  );
}
