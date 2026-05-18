import { useMemo, useState } from 'react';
import { Calendar, Coins, Download, Edit3, Plus, Search, Users } from 'lucide-react';
import { dateKey, rupees } from '../../data/shotsData.js';
import {
  EmptyState, FilterChips, PageHeader, StatCard, StatusPill, Tabs,
} from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import BookingDialog from '../../components/dialogs/BookingDialog.jsx';

const STATUS_ITEMS = (list) => [
  { value: 'All',       label: 'All',       count: list.length },
  { value: 'Active',    label: 'Active',    count: list.filter((b) => b.status === 'Active').length },
  { value: 'Upcoming',  label: 'Upcoming',  count: list.filter((b) => b.status === 'Upcoming').length },
  { value: 'Completed', label: 'Completed', count: list.filter((b) => b.status === 'Completed').length },
];

export default function Bookings() {
  const { bookings, tables } = useShots();
  const today = dateKey(new Date());
  const [scope, setScope] = useState('today');
  const [status, setStatus] = useState('All');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [dialog, setDialog] = useState({ open: false, booking: null });

  const scoped = useMemo(() => {
    if (scope === 'today')    return bookings.filter((b) => b.date === today);
    if (scope === 'upcoming') return bookings.filter((b) => b.date >= today);
    return bookings;
  }, [bookings, scope, today]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((b) => {
      const matchQ = !q || (b.memberName || '').toLowerCase().includes(q) || String(b.tableNumber).includes(q);
      const matchS = status === 'All' || b.status === status;
      return matchQ && matchS;
    }).sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : (a.date > b.date ? 1 : -1)));
  }, [scoped, query, status]);

  const todayList = bookings.filter((b) => b.date === today);
  const todayRevenue = todayList.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="See, manage, and create table bookings across all halls."
        actions={
          <>
            <button className="btn-ghost"><Download className="w-4 h-4" /> Export CSV</button>
            <button onClick={() => setDialog({ open: true, booking: null })} className="btn-primary">
              <Plus className="w-4 h-4" /> New booking
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Calendar} label="Today's bookings" value={todayList.length} sub={`${todayList.filter((b) => b.status === 'Active').length} active right now`} accent="brand" />
        <StatCard icon={Coins}    label="Today's revenue"  value={rupees(todayRevenue)} sub="From bookings only" accent="emerald" />
        <StatCard icon={Users}    label="Players today"    value={todayList.reduce((s, b) => s + (b.players || 0), 0)} sub="Across all tables" accent="blue" />
        <StatCard icon={Calendar} label="Upcoming"         value={bookings.filter((b) => b.date >= today && b.status === 'Upcoming').length} sub="Confirmed for later" accent="amber" />
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-col xl:flex-row gap-3 xl:items-center">
          <Tabs
            value={scope}
            onChange={setScope}
            items={[
              { value: 'today',    label: 'Today' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'all',      label: 'All' },
            ]}
          />
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search member, table…"
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <FilterChips value={status} onChange={setStatus} items={STATUS_ITEMS(scoped)} />
          <div className="xl:ml-auto">
            <Tabs
              value={view}
              onChange={setView}
              items={[
                { value: 'list',  label: 'List' },
                { value: 'board', label: 'By table' },
              ]}
            />
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No bookings"
          message="Try changing scope or filters, or create a new booking."
          cta={<button onClick={() => setDialog({ open: true, booking: null })} className="btn-primary"><Plus className="w-4 h-4" /> New booking</button>}
        />
      ) : view === 'list' ? (
        <ListView list={list} onPick={(b) => setDialog({ open: true, booking: b })} />
      ) : (
        <BoardView list={list} tables={tables} onPick={(b) => setDialog({ open: true, booking: b })} />
      )}

      <BookingDialog
        open={dialog.open}
        booking={dialog.booking}
        onClose={() => setDialog({ open: false, booking: null })}
      />
    </>
  );
}

function ListView({ list, onPick }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="table-th">Date · Time</th>
              <th className="table-th">Table</th>
              <th className="table-th">Member</th>
              <th className="table-th">Type</th>
              <th className="table-th">Players</th>
              <th className="table-th text-right">Amount</th>
              <th className="table-th">Status</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody>
            {list.map((b) => (
              <tr key={b.id} className="hover:bg-slate-50/60 cursor-pointer" onClick={() => onPick(b)}>
                <td className="table-td">
                  <div className="font-semibold">{new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div className="text-[11px] text-ink-400">{b.start} → {b.end}</div>
                </td>
                <td className="table-td">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-50 text-brand-700 font-bold">T{b.tableNumber}</span>
                </td>
                <td className="table-td">
                  <div className="font-semibold">{b.memberName}</div>
                  <div className="text-[11px] text-ink-400">{b.isMember ? b.memberId : 'Walk-in'}</div>
                </td>
                <td className="table-td">
                  <span className="chip bg-slate-100 text-ink-600">{b.memberType || 'Guest'}</span>
                </td>
                <td className="table-td">{b.players}</td>
                <td className="table-td text-right font-bold">{rupees(b.amount)}</td>
                <td className="table-td"><StatusPill value={b.status} /></td>
                <td className="table-td text-right">
                  <span className="text-brand-600 font-bold text-sm inline-flex items-center gap-1">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BoardView({ list, tables, onPick }) {
  const map = new Map();
  list.forEach((b) => {
    if (!map.has(b.tableId)) map.set(b.tableId, []);
    map.get(b.tableId).push(b);
  });
  const groups = Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  if (groups.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.map(([id, bs]) => {
        const tbl = tables.find((t) => t.id === id);
        return (
          <div key={id} className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-ink-900 text-white font-extrabold flex items-center justify-center">T{tbl?.number}</div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold truncate">Table {tbl?.number}</div>
                <div className="text-[11px] text-ink-400">{tbl?.type} · {tbl?.location}</div>
              </div>
              <span className="chip bg-slate-100 text-ink-600">{bs.length}</span>
            </div>
            <ul className="space-y-2">
              {bs.map((b) => (
                <li
                  key={b.id}
                  onClick={() => onPick(b)}
                  className="rounded-xl border border-slate-100 hover:border-brand-200 p-3 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm truncate">{b.memberName}</div>
                    <StatusPill value={b.status} />
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-ink-500 mt-1">
                    <span>{b.start} – {b.end}</span>
                    <span className="font-bold text-ink-700">{rupees(b.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
