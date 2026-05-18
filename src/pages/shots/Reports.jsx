import { useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowUpRight, Award, BarChart3, Calendar, Download, Layers, Printer, Users, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  categoryBreakdown, dailyRevenueSeries, monthlyRevenueSeries, rupees,
} from '../../data/shotsData.js';
import { PageHeader, StatCard, Tabs, TierBadge } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';

const COLORS = ['#E53E3E', '#F4B860', '#3B82F6', '#10B981', '#A855F7', '#FF6B6B', '#64748B', '#0EA5E9'];

export default function Reports() {
  const { finance, bookings, members } = useShots();
  const [range, setRange] = useState('14d');

  const daily = useMemo(() => dailyRevenueSeries(finance, range === '7d' ? 7 : range === '14d' ? 14 : 30), [finance, range]);
  const monthly = useMemo(() => monthlyRevenueSeries(finance, 6), [finance]);

  const totalIn = finance.filter((f) => f.type === 'In').reduce((s, f) => s + f.amount, 0);
  const totalOut = finance.filter((f) => f.type === 'Out').reduce((s, f) => s + f.amount, 0);
  const net = totalIn - totalOut;
  const margin = totalIn ? Math.round((net / totalIn) * 100) : 0;

  const expenseMix = useMemo(() => categoryBreakdown(finance, 'Out'), [finance]);
  const incomeMix = useMemo(() => categoryBreakdown(finance, 'In'), [finance]);

  const tablePerformance = useMemo(() => {
    const map = new Map();
    bookings.forEach((b) => {
      const cur = map.get(b.tableId) || { tableId: b.tableId, label: `T${b.tableNumber}`, revenue: 0, sessions: 0 };
      cur.revenue += b.amount || 0;
      cur.sessions += 1;
      map.set(b.tableId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [bookings]);

  const memberTierMix = useMemo(() => {
    const map = new Map();
    members.forEach((m) => map.set(m.type, (map.get(m.type) || 0) + 1));
    return Array.from(map.entries()).map(([tier, count]) => ({ tier, count }));
  }, [members]);

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        subtitle="Drill into revenue, profit, table performance, and member behavior."
        actions={
          <>
            <button className="btn-ghost"><Printer className="w-4 h-4" /> Print</button>
            <button className="btn-ghost"><Download className="w-4 h-4" /> Export PDF</button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wallet}        label="Lifetime revenue" value={rupees(totalIn)}  sub="All entries · all months" trend="+24%" accent="emerald" />
        <StatCard icon={ArrowDownRight} label="Lifetime expenses" value={rupees(totalOut)} sub="Repairs · utilities · supplies" trend="+8%" accent="rose" />
        <StatCard icon={ArrowUpRight}  label="Net profit"        value={rupees(net)}      sub={`${margin}% margin`} trend={`${margin}%`} accent={net >= 0 ? 'brand' : 'rose'} />
        <StatCard icon={Users}         label="Members"           value={members.length}   sub={`${members.filter((m) => m.status === 'Active').length} active`} accent="indigo" />
      </div>

      {/* Trend area */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Trend</div>
            <h3 className="text-lg font-extrabold mt-0.5">Daily revenue vs expense</h3>
          </div>
          <Tabs
            value={range}
            onChange={setRange}
            items={[
              { value: '7d',  label: 'Last 7 days' },
              { value: '14d', label: 'Last 14 days' },
              { value: '30d', label: 'Last 30 days' },
            ]}
          />
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="r-in" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="r-out" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E53E3E" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#E53E3E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="date" stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
                formatter={(v) => rupees(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="income"  name="Income"  stroke="#10B981" strokeWidth={2.4} fill="url(#r-in)" />
              <Area type="monotone" dataKey="expense" name="Expense" stroke="#E53E3E" strokeWidth={2.4} fill="url(#r-out)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly bars + line */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 xl:col-span-2">
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Monthly performance</div>
            <h3 className="text-lg font-extrabold mt-0.5">Last 6 months</h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 5, right: 8, left: -10, bottom: 0 }} barGap={6}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
                  formatter={(v) => rupees(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income"  name="Income"  fill="#10B981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#E53E3E" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-2">
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Net profit</div>
            <h3 className="text-lg font-extrabold mt-0.5">Profit trajectory</h3>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
                  formatter={(v) => rupees(v)}
                />
                <Line type="monotone" dataKey="net" stroke="#E53E3E" strokeWidth={3} dot={{ r: 4, stroke: '#E53E3E', strokeWidth: 2, fill: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mixes & table performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <MixCard title="Income mix" data={incomeMix} key1="category" />
        <MixCard title="Expense mix" data={expenseMix} key1="category" />
        <div className="card p-5">
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Members</div>
            <h3 className="text-lg font-extrabold mt-0.5">Tier distribution</h3>
          </div>
          <div className="space-y-3">
            {memberTierMix.map((row) => {
              const pct = Math.round((row.count / members.length) * 100);
              return (
                <div key={row.tier}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <TierBadge tier={row.tier} />
                      <span className="text-ink-500 text-xs">{pct}%</span>
                    </div>
                    <div className="font-bold">{row.count}</div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Table performance */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Table performance</div>
            <h3 className="text-lg font-extrabold mt-0.5">Revenue by table</h3>
          </div>
          <span className="text-xs text-ink-500 inline-flex items-center gap-1"><BarChart3 className="w-4 h-4" /> All time</span>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tablePerformance} margin={{ top: 5, right: 8, left: -10, bottom: 0 }} barCategoryGap="22%">
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="label" stroke="#94A3B8" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis stroke="#94A3B8" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
                formatter={(v) => rupees(v)}
              />
              <Bar dataKey="revenue" radius={[10, 10, 0, 0]}>
                {tablePerformance.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function MixCard({ title, data, key1 }) {
  return (
    <div className="card p-5">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Breakdown</div>
        <h3 className="text-lg font-extrabold mt-0.5">{title}</h3>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey={key1} innerRadius={48} outerRadius={75} paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
              formatter={(v) => rupees(v)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-2">
        {data.map((d, i) => (
          <div key={d[key1]} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="truncate text-ink-600 font-semibold">{d[key1]}</span>
            <span className="ml-auto text-ink-500">{rupees(d.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
