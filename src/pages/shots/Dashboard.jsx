import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Calendar, Coins, Download, Grid3X3,
  TrendingDown, TrendingUp, Users, Wallet,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  dailyRevenueSeries, categoryBreakdown, rupees, dateKey, timeframeRange,
} from '../../data/shotsData.js';
import { PageHeader, StatCard, StatusPill, TierBadge } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import { downloadCsvMatrix, csvDate } from '../../lib/csv.js';

const PIE_COLORS = ['#E53E3E', '#F4B860', '#3B82F6', '#10B981', '#A855F7', '#FF6B6B', '#64748B'];

const TIMEFRAMES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'mtd', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'year', label: 'This Year' },
  { key: 'all', label: 'All Time' },
];

export default function Dashboard() {
  const { tables, members, bookings, finance } = useShots();
  const [timeframe, setTimeframe] = useState('mtd');
  const today = dateKey(new Date());

  const timeframeLabel = TIMEFRAMES.find((t) => t.key === timeframe)?.label || 'This Month';

  // Period-scoped data + totals — drives both the on-screen figures and the export.
  const period = useMemo(() => {
    const range = timeframeRange(timeframe, new Date());
    const inRange = (d) => !range || (d >= range.start && d <= range.end);

    const periodBookings = bookings
      .filter((b) => b.status !== 'Cancelled' && inRange(b.date))
      .sort((a, b) => (a.date === b.date ? (a.start || '').localeCompare(b.start || '') : a.date < b.date ? -1 : 1));
    const periodFinance = finance
      .filter((f) => inRange(f.date))
      .sort((a, b) => (a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date < b.date ? -1 : 1));

    const bookingRevenue    = periodBookings.reduce((s, b) => s + (b.amount || 0), 0);
    const membershipSales   = periodFinance.filter((f) => f.type === 'In' && f.category === 'Membership');
    const otherIncome       = periodFinance.filter((f) => f.type === 'In' && f.category !== 'Membership');
    const expenses          = periodFinance.filter((f) => f.type === 'Out');
    const membershipRevenue = membershipSales.reduce((s, f) => s + (f.amount || 0), 0);
    const otherIncomeTotal  = otherIncome.reduce((s, f) => s + (f.amount || 0), 0);
    const expensesTotal     = expenses.reduce((s, f) => s + (f.amount || 0), 0);
    const totalRevenue      = bookingRevenue + membershipRevenue + otherIncomeTotal;

    return {
      range, periodBookings, membershipSales, otherIncome, expenses,
      bookingRevenue, membershipRevenue, otherIncomeTotal, expensesTotal,
      totalRevenue, netProfit: totalRevenue - expensesTotal,
    };
  }, [timeframe, bookings, finance]);

  // The "Today's bookings" widget is always today, independent of the filter.
  const todayBookings = bookings.filter((b) => b.date === today);

  const activeMembers = members.filter((m) => m.status === 'Active').length;
  const expiredMembers = members.filter((m) => m.status === 'Expired').length;

  const occupied = tables.filter((t) => t.status === 'Occupied').length;
  const available = tables.filter((t) => t.status === 'Available').length;

  const series = useMemo(() => dailyRevenueSeries(finance, 14), [finance]);
  const incomeBreakdown = useMemo(() => categoryBreakdown(finance, 'In'), [finance]);

  const recent = [...finance].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  // Detailed, multi-section CSV report for the selected timeframe.
  const exportCsv = () => {
    const {
      range, periodBookings, membershipSales, otherIncome, expenses,
      bookingRevenue, membershipRevenue, otherIncomeTotal, expensesTotal, totalRevenue, netProfit,
    } = period;
    const rangeText = range ? `${range.start} to ${range.end}` : 'All time';
    const tableNo = (n) => (n ? `Table ${n}` : 'General');
    const discountNote = (d) => {
      if (!d) return '';
      const base = d.type === 'percent' ? `${d.value}% off` : `Rs. ${d.value} off`;
      return d.reason ? `${base} (${d.reason})` : base;
    };

    const M = [];
    const blank = () => M.push([]);

    // ---- Header ----
    M.push(['SHOTS — Business Report']);
    M.push(['Period', timeframeLabel, rangeText]);
    M.push(['Generated', new Date().toLocaleString('en-PK')]);
    blank();

    // ---- Summary ----
    M.push(['SUMMARY']);
    M.push(['Metric', 'Amount (Rs.)']);
    M.push(['Booking Revenue', bookingRevenue]);
    M.push(['Membership Revenue', membershipRevenue]);
    M.push(['Other Income', otherIncomeTotal]);
    M.push(['Total Revenue', totalRevenue]);
    M.push(['Total Expenses', expensesTotal]);
    M.push(['Net Profit', netProfit]);
    blank();

    // ---- Daily breakdown ----
    const dayKeys = Array.from(new Set([
      ...periodBookings.map((b) => b.date),
      ...membershipSales.map((f) => f.date),
      ...otherIncome.map((f) => f.date),
      ...expenses.map((f) => f.date),
    ])).filter(Boolean).sort();
    M.push(['DAILY BREAKDOWN']);
    M.push(['Date', 'Booking Revenue', 'Membership Revenue', 'Other Income', 'Expenses', 'Net (Rs.)']);
    dayKeys.forEach((d) => {
      const bRev = periodBookings.filter((b) => b.date === d).reduce((s, b) => s + (b.amount || 0), 0);
      const mRev = membershipSales.filter((f) => f.date === d).reduce((s, f) => s + (f.amount || 0), 0);
      const oRev = otherIncome.filter((f) => f.date === d).reduce((s, f) => s + (f.amount || 0), 0);
      const exp  = expenses.filter((f) => f.date === d).reduce((s, f) => s + (f.amount || 0), 0);
      M.push([d, bRev, mRev, oRev, exp, bRev + mRev + oRev - exp]);
    });
    blank();

    // ---- Bookings (sales) ----
    M.push([`BOOKINGS — SALES (${periodBookings.length})`]);
    M.push(['Date', 'Start', 'End', 'Table', 'Type', 'Customer', 'Member ID', 'Tier', 'Players', 'Duration (min)', 'Subtotal (Rs.)', 'Discount (Rs.)', 'Discount Note', 'Amount (Rs.)', 'Status']);
    periodBookings.forEach((b) => {
      M.push([
        b.date, b.start || '', b.end || '', `Table ${b.tableNumber}`,
        b.isMember ? 'Member' : 'Walk-in', b.memberName || '',
        b.isMember ? (b.memberId || '') : '', b.isMember ? (b.memberType || '') : '',
        b.players || 1, (b.intervals?.length || 0) * 15,
        b.subtotal ?? b.amount ?? 0, b.discount?.amount || 0, discountNote(b.discount),
        b.amount || 0, b.status || '',
      ]);
    });
    M.push(['', '', '', '', '', '', '', '', '', '', '', '', 'Total', bookingRevenue, '']);
    blank();

    // ---- Membership sales ----
    M.push([`MEMBERSHIP SALES (${membershipSales.length})`]);
    M.push(['Date', 'Time', 'Category', 'Description', 'Amount (Rs.)']);
    membershipSales.forEach((f) => {
      M.push([f.date, f.time || '', f.category || 'Membership', f.description || '', f.amount || 0]);
    });
    M.push(['', '', '', 'Total', membershipRevenue]);
    blank();

    // ---- Other income ----
    M.push([`OTHER INCOME (${otherIncome.length})`]);
    M.push(['Date', 'Time', 'Category', 'Description', 'Amount (Rs.)']);
    otherIncome.forEach((f) => {
      M.push([f.date, f.time || '', f.category || '', f.description || '', f.amount || 0]);
    });
    M.push(['', '', '', 'Total', otherIncomeTotal]);
    blank();

    // ---- Expenses ----
    M.push([`EXPENSES (${expenses.length})`]);
    M.push(['Date', 'Time', 'Category', 'Description', 'Allocated To', 'Amount (Rs.)']);
    expenses.forEach((f) => {
      M.push([f.date, f.time || '', f.category || '', f.description || '', tableNo(f.table), f.amount || 0]);
    });
    M.push(['', '', '', '', 'Total', expensesTotal]);

    const safeLabel = timeframeLabel.toLowerCase().replace(/\s+/g, '-');
    downloadCsvMatrix(`shots-report-${safeLabel}-${csvDate()}.csv`, M);
  };

  return (
    <>
      <PageHeader
        title="Dashboard overview"
        subtitle={`Welcome back. Here's what's happening at Shots today, ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.`}
        actions={
          <>
            <div className="relative">
              <Calendar className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="input pl-9 pr-8 py-2 font-semibold cursor-pointer appearance-none"
                title="Choose the timeframe for the figures and export"
              >
                {TIMEFRAMES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <button onClick={exportCsv} className="btn-primary" title={`Export a detailed CSV for: ${timeframeLabel}`}>
              <Download className="w-4 h-4" />
              Export
            </button>
          </>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Coins}
          label={`Revenue · ${timeframeLabel}`}
          value={rupees(period.totalRevenue)}
          sub="Bookings + memberships + other income"
          accent="brand"
        />
        <StatCard
          icon={Calendar}
          label={`Bookings · ${timeframeLabel}`}
          value={period.periodBookings.length}
          sub={`${rupees(period.bookingRevenue)} from bookings`}
          accent="blue"
        />
        <StatCard
          icon={Users}
          label="Active Members"
          value={activeMembers}
          sub={`${expiredMembers} expired this month`}
          trend="+4 new"
          accent="emerald"
        />
        <StatCard
          icon={Grid3X3}
          label="Tables"
          value={`${available} / ${tables.length}`}
          sub={`${occupied} occupied · ${tables.length - available - occupied} maintenance`}
          accent="amber"
        />
      </div>

      {/* Revenue chart + MTD card */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Cash flow · 14 days</div>
              <h3 className="text-lg font-extrabold mt-0.5">Revenue vs Expense</h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Legend2 color="#10B981" label="Income" />
              <Legend2 color="#E53E3E" label="Expense" />
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-in" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-out" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#E53E3E" stopOpacity={0.3} />
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
                <Area type="monotone" dataKey="income"  stroke="#10B981" strokeWidth={2.4} fill="url(#g-in)"  />
                <Area type="monotone" dataKey="expense" stroke="#E53E3E" strokeWidth={2.4} fill="url(#g-out)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MTD card */}
        <div className="card p-5 bg-brand-gradient text-white relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-white/10 blur-xl" />
          <div className="absolute -bottom-16 -left-10 w-44 h-44 rounded-full bg-black/15 blur-xl" />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-widest font-bold opacity-80">{timeframeLabel}</div>
            <h3 className="text-3xl font-extrabold mt-1">{rupees(period.netProfit)}</h3>
            <p className="text-xs opacity-80">Net profit</p>

            <div className="mt-5 space-y-3">
              <MTDRow label="Total Revenue" amount={period.totalRevenue} Icon={TrendingUp} tone="bg-white/15" />
              <MTDRow label="Expenses"      amount={period.expensesTotal} Icon={TrendingDown} tone="bg-black/15" />
              <div className="h-px bg-white/20" />
              <MTDRow label="Net Profit" amount={period.netProfit} Icon={Wallet} tone="bg-white/25" emphasized />
            </div>

          </div>
        </div>
      </div>

      {/* Bookings today + breakdowns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        {/* Bookings list */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Schedule</div>
              <h3 className="text-lg font-extrabold mt-0.5">Today's bookings</h3>
            </div>
            <Link to="/admin/bookings" className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-th">Time</th>
                  <th className="table-th">Table</th>
                  <th className="table-th">Member</th>
                  <th className="table-th">Players</th>
                  <th className="table-th text-right">Amount</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-sm text-ink-500 py-8">No bookings today.</td>
                  </tr>
                ) : (
                  todayBookings.slice(0, 6).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="table-td">
                        <div className="font-bold">{b.start}</div>
                        <div className="text-[11px] text-ink-400">→ {b.end}</div>
                      </td>
                      <td className="table-td">
                        <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-700 font-bold">
                          T{b.tableNumber}
                        </div>
                      </td>
                      <td className="table-td">
                        <div className="font-semibold">{b.memberName}</div>
                        <div className="text-[11px] text-ink-400">{b.isMember ? `${b.memberType || 'Member'} · ${b.memberId}` : 'Walk-in'}</div>
                      </td>
                      <td className="table-td">{b.players}</td>
                      <td className="table-td text-right font-bold">{rupees(b.amount)}</td>
                      <td className="table-td"><StatusPill value={b.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Income breakdown pie */}
        <div className="card p-5">
          <div className="mb-2">
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Revenue mix</div>
            <h3 className="text-lg font-extrabold mt-0.5">Income by category</h3>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeBreakdown}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {incomeBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 10px 28px -8px rgba(15,23,42,0.18)' }}
                  formatter={(v) => rupees(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {incomeBreakdown.map((it, i) => (
              <div key={it.category} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-ink-600 font-semibold truncate">{it.category}</span>
                <span className="ml-auto text-ink-500">{rupees(it.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity + top members */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Activity</div>
              <h3 className="text-lg font-extrabold mt-0.5">Recent transactions</h3>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {recent.map((tx) => (
              <li key={tx.id} className="flex items-center gap-3 py-3">
                <div className={[
                  'w-10 h-10 rounded-xl flex items-center justify-center',
                  tx.type === 'In' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
                ].join(' ')}>
                  {tx.type === 'In' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{tx.category}</div>
                  <div className="text-[12px] text-ink-500 truncate">{tx.description}</div>
                </div>
                <div className="text-right">
                  <div className={['text-sm font-extrabold', tx.type === 'In' ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
                    {tx.type === 'In' ? '+' : '−'} {rupees(tx.amount)}
                  </div>
                  <div className="text-[11px] text-ink-400">{new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {tx.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">People</div>
              <h3 className="text-lg font-extrabold mt-0.5">Top members</h3>
            </div>
            <Link to="/admin/memberships" className="text-xs font-bold text-brand-600 hover:text-brand-700">View all</Link>
          </div>
          <ul className="space-y-2">
            {[...members].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5).map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-ink-700">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{m.name}</div>
                  <div className="text-[11px] text-ink-400">{m.visits} visits</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{rupees(m.totalSpent)}</div>
                  <TierBadge tier={m.type} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </>
  );
}

function Legend2({ color, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-600 font-semibold">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function MTDRow({ label, amount, Icon, tone, emphasized }) {
  return (
    <div className={['flex items-center justify-between rounded-xl px-3 py-2.5', tone].join(' ')}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 opacity-90" />
        <span className={emphasized ? 'font-bold' : 'text-sm'}>{label}</span>
      </div>
      <div className={emphasized ? 'font-extrabold text-lg' : 'font-bold'}>{rupees(amount)}</div>
    </div>
  );
}
