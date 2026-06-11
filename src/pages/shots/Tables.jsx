import { useMemo, useState } from 'react';
import {
  Calendar, Clock, Edit3, Grid3X3, MapPin, Plus, Search, Sparkles, Wrench,
} from 'lucide-react';
import { rupees, relativeFromNow } from '../../data/shotsData.js';
import { FilterChips, PageHeader, StatCard, StatusPill, EmptyState } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import TableDialog from '../../components/dialogs/TableDialog.jsx';
import BookingDialog from '../../components/dialogs/BookingDialog.jsx';

const STATUS_FILTERS = (list) => [
  { value: 'All',         label: 'All',         count: list.length },
  { value: 'Available',   label: 'Available',   count: list.filter((t) => t.status === 'Available').length },
  { value: 'Occupied',    label: 'Occupied',    count: list.filter((t) => t.status === 'Occupied').length },
  { value: 'Maintenance', label: 'Maintenance', count: list.filter((t) => t.status === 'Maintenance').length },
];
const TYPE_FILTERS = [
  { value: 'All',     label: 'All types' },
  { value: 'Pool',    label: 'Pool' },
  { value: 'Snooker', label: 'Snooker' },
];

export default function Tables() {
  const { tables } = useShots();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [type, setType] = useState('All');
  const [tableDialog, setTableDialog] = useState({ open: false, table: null });
  const [bookingDialog, setBookingDialog] = useState({ open: false, table: null });

  const list = useMemo(() => {
    return tables.filter((t) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || String(t.number).includes(q) || t.type.toLowerCase().includes(q) || t.location.toLowerCase().includes(q);
      const matchS = status === 'All' || t.status === status;
      const matchT = type === 'All' || t.type === type;
      return matchQ && matchS && matchT;
    });
  }, [tables, query, status, type]);

  const occupied = tables.filter((t) => t.status === 'Occupied').length;
  const available = tables.filter((t) => t.status === 'Available').length;
  const maintenance = tables.filter((t) => t.status === 'Maintenance').length;

  return (
    <>
      <PageHeader
        title="Tables management"
        subtitle="Add, edit, and monitor every snooker & pool table across all halls."
        actions={
          <>
            <button onClick={() => setBookingDialog({ open: true, table: null })} className="btn-ghost">
              <Calendar className="w-4 h-4" /> New booking
            </button>
            <button onClick={() => setTableDialog({ open: true, table: null })} className="btn-primary">
              <Plus className="w-4 h-4" /> Add table
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Grid3X3}  label="Total tables" value={tables.length} sub="Across all halls" accent="brand" />
        <StatCard icon={Sparkles} label="Available"    value={available}     sub="Ready to book"    accent="emerald" />
        <StatCard icon={Clock}    label="Occupied"     value={occupied}      sub="Active sessions"  accent="amber" />
        <StatCard icon={Wrench}   label="Maintenance"  value={maintenance}   sub="Pending repair"   accent="rose" />
      </div>

      <div className="card p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search by table #, type, location…"
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <FilterChips value={status} onChange={setStatus} items={STATUS_FILTERS(tables)} />
          <div className="lg:ml-auto">
            <FilterChips value={type} onChange={setType} items={TYPE_FILTERS} />
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Grid3X3}
          title="No tables yet"
          message={tables.length === 0 ? 'Add your first table to get started.' : 'Try clearing filters or changing your search.'}
          cta={tables.length === 0 && (
            <button onClick={() => setTableDialog({ open: true, table: null })} className="btn-primary"><Plus className="w-4 h-4" /> Add table</button>
          )}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((t) => (
            <TableCard
              key={t.id}
              t={t}
              onEdit={() => setTableDialog({ open: true, table: t })}
              onBook={() => setBookingDialog({ open: true, table: t })}
            />
          ))}
        </div>
      )}

      <TableDialog
        open={tableDialog.open}
        table={tableDialog.table}
        onClose={() => setTableDialog({ open: false, table: null })}
      />
      <BookingDialog
        open={bookingDialog.open}
        booking={null}
        defaults={bookingDialog.table ? { tableId: bookingDialog.table.id } : undefined}
        onClose={() => setBookingDialog({ open: false, table: null })}
      />
    </>
  );
}

function TableCard({ t, onEdit, onBook }) {
  const freeIn = relativeFromNow(t.occupiedUntil);
  return (
    <div className="card card-hover p-5 relative overflow-hidden">
      <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-transparent via-brand-200 to-transparent opacity-40" />
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-2xl bg-ink-900 text-white flex flex-col items-center justify-center shadow-pop">
          <div className="text-[9px] uppercase tracking-widest opacity-70">Table</div>
          <div className="text-xl font-extrabold leading-none">{t.number}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-lg">{t.type}</h4>
            <span className="chip bg-slate-100 text-ink-600">{t.condition}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-ink-500 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {t.location}
          </div>
        </div>
        <StatusPill value={t.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">Member rate</div>
          <div className="font-extrabold text-ink-800 mt-0.5">{rupees(t.memberRate)} <span className="text-xs text-ink-500 font-medium">/ hr</span></div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">Non-member</div>
          <div className="font-extrabold text-ink-800 mt-0.5">{rupees(t.nonMemberRate)} <span className="text-xs text-ink-500 font-medium">/ hr</span></div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 col-span-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-400 font-bold">Hours</div>
          <div className="text-sm text-ink-700 mt-0.5 font-semibold">{t.openTime} – {t.closeTime}</div>
        </div>
      </div>

      {t.status === 'Occupied' && (
        <div className="mt-3 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs">
          <div className="font-bold text-amber-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {t.occupiedBy}</div>
          <div className="text-amber-700/80">Free in <span className="font-bold">{freeIn || '—'}</span></div>
        </div>
      )}
      {t.status === 'Maintenance' && (
        <div className="mt-3 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700 flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5" /> Out of service · last cleaned {t.lastCleaned}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="text-[11px] text-ink-400">Last cleaned · {t.lastCleaned}</div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="btn-ghost px-2.5 py-1.5 text-xs">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={onBook}
            disabled={t.status === 'Maintenance'}
            title={t.status === 'Maintenance' ? 'Under maintenance — cannot be booked' : undefined}
            className="btn-primary px-2.5 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Book
          </button>
        </div>
      </div>
    </div>
  );
}
