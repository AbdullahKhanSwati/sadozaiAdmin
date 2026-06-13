import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Calendar, Check, Coins, Grid3X3, Percent, Plus, Save,
  Search, Trash2, User, Users, X,
} from 'lucide-react';
import {
  addMinutes, bookedIntervalsFor, buildIntervals, dateKey,
  intervalsForRange, nextSevenDays, rupees, minutesToLabel,
} from '../../data/shotsData.js';
import { useShots } from '../../store/ShotsStore.jsx';

const MAX_MEMBERS = 4;

const blankPicker = (defaults) => ({
  tableId: defaults?.tableId || null,
  date: defaults?.date || dateKey(new Date()),
  start: defaults?.start || '11:00',
  durationMin: 60, // 1 hr
  isMember: true,
  members: [],
  guestName: '',
  guestPhone: '',
  discountType: 'none',
  discountValue: '',
  discountReason: '',
});

export default function BookingDialog({ open, onClose, booking, defaults }) {
  const { tables, members, bookings, bookingDurations, addBooking, updateBooking, deleteBooking } = useShots();
  const editing = !!booking;
  const [form, setForm] = useState(() => blankPicker(defaults));
  const [error, setError] = useState('');
  const [memberQuery, setMemberQuery] = useState('');

  // Only the durations configured in Settings → Booking durations are offered.
  const durations = useMemo(
    () => [...bookingDurations]
      .sort((a, b) => a.minutes - b.minutes)
      .map((d) => ({ minutes: d.minutes, label: minutesToLabel(d.minutes) })),
    [bookingDurations]
  );

  useEffect(() => {
    if (!open) return;
    const defaultMin = durations.find((d) => d.minutes === 60)?.minutes ?? durations[0]?.minutes ?? 60;
    if (editing) {
      const mins = (booking.intervals?.length || 4) * 15;
      setForm({
        tableId: booking.tableId,
        date: booking.date,
        start: booking.start,
        durationMin: durations.some((d) => d.minutes === mins) ? mins : defaultMin,
        isMember: booking.isMember !== false,
        members: booking.members?.map((m) => ({ id: m.id, name: m.name, type: m.type })) || (booking.memberId ? [{ id: booking.memberId, name: booking.memberName, type: booking.memberType }] : []),
        guestName: !booking.isMember ? booking.memberName : '',
        guestPhone: '',
        discountType: booking.discount?.type || 'none',
        discountValue: booking.discount?.value ? String(booking.discount.value) : '',
        discountReason: booking.discount?.reason || '',
      });
    } else {
      setForm({ ...blankPicker(defaults), durationMin: defaultMin });
    }
    setError('');
    setMemberQuery('');
  }, [open, editing, booking, defaults, durations]);

  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const table = useMemo(() => tables.find((t) => t.id === form.tableId), [tables, form.tableId]);
  const duration = durations.find((d) => d.minutes === form.durationMin) || durations[0];
  const endValue = useMemo(() => (form.start && duration ? addMinutes(form.start, duration.minutes) : ''), [form.start, duration]);
  const intervals = useMemo(() => (form.start && duration ? intervalsForRange(form.start, duration.minutes) : []), [form.start, duration]);
  const existingBooked = useMemo(() => {
    if (!table) return new Set();
    return bookedIntervalsFor(bookings, table.id, form.date, editing ? booking.id : null);
  }, [bookings, table, form.date, editing, booking]);
  const conflict = intervals.some((iv) => existingBooked.has(iv));

  const rate = table ? (form.isMember ? table.memberRate : table.nonMemberRate) : 0;
  const subtotal = Math.round((rate * (duration?.minutes || 0)) / 60);
  const discountAmount = useMemo(() => {
    const v = Number(form.discountValue) || 0;
    if (form.discountType === 'percent') return Math.round(subtotal * (v / 100));
    if (form.discountType === 'fixed') return v;
    return 0;
  }, [form.discountType, form.discountValue, subtotal]);
  const total = Math.max(0, subtotal - discountAmount);

  // Build the slot picker grid for the chosen table
  const slots = useMemo(() => {
    if (!table) return [];
    return buildIntervals(table.openTime, table.closeTime, 15);
  }, [table]);

  const toggleMember = (m) => {
    setForm((s) => {
      const exists = s.members.find((x) => x.id === m.id);
      if (exists) return { ...s, members: s.members.filter((x) => x.id !== m.id) };
      if (s.members.length >= MAX_MEMBERS) return s;
      return { ...s, members: [...s.members, { id: m.id, name: m.name, type: m.type }] };
    });
  };

  const handleSave = () => {
    setError('');
    if (!table) return setError('Pick a table.');
    if (!editing && table.status === 'Maintenance') return setError('This table is under maintenance and cannot be booked.');
    if (!duration) return setError('No booking durations are set up. Add them in Settings → Booking durations.');
    if (conflict) return setError('Selected duration overlaps an existing booking — pick a shorter duration or different start.');
    if (form.isMember && form.members.length === 0) return setError('Pick at least one member for this booking.');
    if (!form.isMember && !form.guestName) return setError('Enter the guest name.');

    const payload = {
      tableId: table.id,
      tableNumber: table.number,
      date: form.date,
      start: form.start,
      end: endValue,
      intervals,
      players: form.isMember ? Math.max(form.members.length, 1) : 1,
      isMember: form.isMember,
      members: form.isMember ? form.members : [],
      memberType: form.isMember ? form.members[0]?.type : null,
      memberName: form.isMember ? form.members.map((m) => m.name).join(', ') : form.guestName,
      memberId: form.isMember ? form.members[0]?.id : null,
      subtotal,
      discount: form.discountType !== 'none' && Number(form.discountValue) > 0
        ? { type: form.discountType, value: Number(form.discountValue), amount: discountAmount, reason: form.discountReason || null }
        : null,
      amount: total,
    };

    if (editing) {
      updateBooking(booking.id, payload);
    } else {
      addBooking(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!editing) return;
    if (confirm(`Cancel booking #${booking.id}? This will free up the slot.`)) {
      deleteBooking(booking.id);
      onClose();
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = memberQuery.trim().toLowerCase();
    return !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.phone || '').includes(q);
  });

  const dateLabel = new Date(form.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-pop w-full max-w-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">{editing ? 'Amend booking' : 'New booking'}</div>
            <h3 className="text-xl font-extrabold">{editing ? `Booking #${booking.id}` : `Book a table`}</h3>
            {table && <p className="text-xs text-ink-500 mt-0.5">Table #{table.number} · {table.type} · {table.location}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT: When + Where */}
          <div className="space-y-4">
            {/* Table picker */}
            <Section label="Table" icon={<Grid3X3 className="w-4 h-4" />}>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {tables.map((t) => {
                  const active = form.tableId === t.id;
                  const maint = t.status === 'Maintenance';
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={maint && !active}
                      onClick={() => { if (!maint) setField('tableId', t.id); }}
                      title={maint ? 'Under maintenance — cannot be booked' : undefined}
                      className={[
                        'rounded-xl p-2 border text-center transition',
                        maint && !active ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed' :
                        active ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-300' : 'border-slate-200 hover:bg-slate-50',
                      ].join(' ')}
                    >
                      <div className="font-extrabold">T{t.number}</div>
                      <div className={['text-[10px] uppercase tracking-widest', maint ? 'text-amber-500 font-bold' : 'text-ink-400'].join(' ')}>
                        {maint ? 'Maint.' : t.type}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Date picker */}
            <Section label="Date" icon={<Calendar className="w-4 h-4" />}>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {nextSevenDays().map((d) => {
                  const k = dateKey(d);
                  const active = form.date === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setField('date', k)}
                      className={[
                        'shrink-0 rounded-xl px-3 py-2 text-center transition border',
                        active ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-slate-200 hover:bg-slate-50 text-ink-700',
                      ].join(' ')}
                    >
                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-80">{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className="text-lg font-extrabold leading-tight">{d.getDate()}</div>
                      <div className="text-[10px] opacity-80">{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                    </button>
                  );
                })}
              </div>
              <input
                type="date"
                className="input mt-2"
                value={form.date}
                onChange={(e) => setField('date', e.target.value)}
              />
            </Section>

            {/* Start time slot */}
            <Section label="Start time" hint={`${slots.length} slots · open ${table?.openTime || '—'} – ${table?.closeTime || '—'}`}>
              {table ? (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2 bg-slate-50">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {slots.map((s) => {
                      const taken = existingBooked.has(s.value);
                      const active = form.start === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          disabled={taken}
                          onClick={() => setField('start', s.value)}
                          className={[
                            'px-2 py-1.5 rounded-lg text-[11px] font-bold transition',
                            taken ? 'bg-rose-50 text-rose-300 line-through cursor-not-allowed' :
                            active ? 'bg-brand-gradient text-white shadow-brand' :
                            'bg-white border border-slate-200 hover:border-brand-300 text-ink-700',
                          ].join(' ')}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-500">Pick a table to see available slots.</p>
              )}
            </Section>

            {/* Duration — only the options configured in Settings */}
            <Section label="Duration">
              {durations.length === 0 ? (
                <p className="text-xs text-ink-500">
                  No booking durations set up yet. Add them in <span className="font-semibold">Settings → Booking durations</span>.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {durations.map((d) => {
                    const active = form.durationMin === d.minutes;
                    return (
                      <button
                        key={d.minutes}
                        type="button"
                        onClick={() => setField('durationMin', d.minutes)}
                        className={[
                          'px-3 py-1.5 rounded-full text-xs font-bold border',
                          active ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-slate-200 text-ink-600 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="text-xs text-ink-500 mt-2">
                Ends at <span className="font-bold text-ink-800">{endValue || '—'}</span>
              </div>
              {conflict && (
                <div className="mt-2 flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-100 px-3 py-2 text-xs text-rose-700">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                  This duration overlaps another booking — shorten or pick a different start.
                </div>
              )}
            </Section>
          </div>

          {/* RIGHT: Who + Money */}
          <div className="space-y-4">
            {/* Member / Guest toggle */}
            <Section label="Players">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <ChoicePill active={form.isMember}  onClick={() => setField('isMember', true)}  Icon={Users} label="Members" />
                <ChoicePill active={!form.isMember} onClick={() => setField('isMember', false)} Icon={User}  label="Walk-in guest" />
              </div>

              {form.isMember ? (
                <>
                  {form.members.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.members.map((m) => (
                        <span key={m.id} className="chip bg-brand-50 text-brand-700 pr-1">
                          {m.name}
                          <button onClick={() => toggleMember(m)} className="ml-1 w-4 h-4 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-700 inline-flex items-center justify-center">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      className="input pl-9"
                      placeholder={`Add member (${form.members.length}/${MAX_MEMBERS})`}
                      value={memberQuery}
                      onChange={(e) => setMemberQuery(e.target.value)}
                    />
                  </div>
                  {memberQuery && (
                    <ul className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                      {filteredMembers.length === 0 && <li className="px-3 py-2 text-xs text-ink-500">No members match.</li>}
                      {filteredMembers.slice(0, 8).map((m) => {
                        const picked = !!form.members.find((x) => x.id === m.id);
                        return (
                          <li key={m.id}>
                            <button
                              onClick={() => toggleMember(m)}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
                            >
                              <div className="w-8 h-8 rounded-full bg-brand-gradient text-white font-bold flex items-center justify-center text-sm">
                                {m.name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{m.name}</div>
                                <div className="text-[11px] text-ink-400 font-mono">{m.id} · {m.type}</div>
                              </div>
                              {picked && <Check className="w-4 h-4 text-brand-500" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <input className="input" placeholder="Guest name" value={form.guestName} onChange={(e) => setField('guestName', e.target.value)} />
                  <input className="input" placeholder="Guest phone (optional)" value={form.guestPhone} onChange={(e) => setField('guestPhone', e.target.value)} />
                </div>
              )}
            </Section>

            {/* Discount */}
            <Section label="Discount" icon={<Percent className="w-4 h-4" />}>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {['none', 'percent', 'fixed'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setField('discountType', t)}
                    className={[
                      'px-3 py-1.5 rounded-lg text-xs font-bold border capitalize',
                      form.discountType === t ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-slate-200 text-ink-600',
                    ].join(' ')}
                  >
                    {t === 'none' ? 'No discount' : t === 'percent' ? '%' : 'Rs.'}
                  </button>
                ))}
              </div>
              {form.discountType !== 'none' && (
                <div className="space-y-2">
                  <input
                    type="number"
                    className="input"
                    placeholder={form.discountType === 'percent' ? 'e.g. 10' : 'Rs. amount'}
                    value={form.discountValue}
                    onChange={(e) => setField('discountValue', e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Reason (optional)"
                    value={form.discountReason}
                    onChange={(e) => setField('discountReason', e.target.value)}
                  />
                </div>
              )}
            </Section>

            {/* Summary */}
            <div className="rounded-2xl bg-brand-gradient text-white p-5 relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-lg" />
              <div className="relative">
                <div className="text-[11px] uppercase tracking-widest font-bold opacity-85">Booking summary</div>
                <div className="text-xs opacity-90 mt-2">{dateLabel} · {form.start} – {endValue}</div>
                <div className="mt-3 space-y-1 text-sm">
                  <Row label="Rate" value={`${rupees(rate)} / hr`} />
                  <Row label="Subtotal" value={rupees(subtotal)} />
                  {discountAmount > 0 && <Row label={`Discount ${form.discountType === 'percent' ? `(${form.discountValue}%)` : ''}`} value={`− ${rupees(discountAmount)}`} />}
                </div>
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
                  <span className="text-sm font-semibold opacity-90">Total</span>
                  <span className="text-2xl font-extrabold">{rupees(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{error}</div>}

        <div className="flex items-center justify-between gap-2 mt-6">
          {editing ? (
            <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-4 h-4" /> Cancel booking</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Close</button>
            <button onClick={handleSave} className="btn-primary">
              {editing ? <><Save className="w-4 h-4" /> Save changes</> : <><Plus className="w-4 h-4" /> Confirm booking</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ label, hint, icon, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-500 font-bold">
          {icon}{label}
        </div>
        {hint && <div className="text-[11px] text-ink-400 font-medium">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ChoicePill({ active, onClick, Icon, label }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={[
        'rounded-xl px-3 py-2 text-sm font-bold border transition flex items-center gap-2 justify-center',
        active ? 'bg-ink-900 text-white border-ink-900' : 'bg-white border-slate-200 text-ink-700 hover:bg-slate-50',
      ].join(' ')}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="opacity-85">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
