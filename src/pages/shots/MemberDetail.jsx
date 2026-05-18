import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Coins, CreditCard, Edit3, Mail, Phone, Trash2, Users,
} from 'lucide-react';
import { rupees } from '../../data/shotsData.js';
import { EmptyState, StatCard, StatusPill, TierBadge } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import MembershipVirtualCard from '../../components/MembershipVirtualCard.jsx';
import MemberDialog from '../../components/dialogs/MemberDialog.jsx';

export default function MemberDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { members, bookings, deleteMember } = useShots();
  const [editOpen, setEditOpen] = useState(false);
  const m = members.find((x) => x.id === id);

  if (!m) {
    return (
      <EmptyState
        icon={Users}
        title="Member not found"
        message="The member you tried to open does not exist."
        cta={<Link to="/admin/memberships" className="btn-primary"><ArrowLeft className="w-4 h-4" /> Back to memberships</Link>}
      />
    );
  }

  const history = bookings.filter((b) => b.memberId === m.id);

  const handleDelete = () => {
    if (confirm(`Delete ${m.name}? This action cannot be undone.`)) {
      deleteMember(m.id);
      navigate('/admin/memberships');
    }
  };

  return (
    <>
      <button onClick={() => navigate(-1)} className="text-sm font-bold text-ink-500 hover:text-ink-700 inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Profile + virtual card */}
        <div className="card p-6 xl:col-span-1">
          <MembershipVirtualCard member={m} />

          <div className="space-y-3 mt-5">
            <InfoLine icon={Phone} label="Phone" value={m.phone} />
            <InfoLine icon={Mail}  label="Email" value={m.email || '—'} />
            <InfoLine icon={CreditCard} label="CNIC" value={m.cnic} mono />
            <InfoLine icon={Calendar}   label="Joined"  value={new Date(m.joinDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <InfoLine icon={Calendar}   label="Expires" value={new Date(m.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} />
          </div>

          <div className="flex items-center gap-2 mt-6">
            <button onClick={() => setEditOpen(true)} className="btn-ghost flex-1"><Edit3 className="w-4 h-4" /> Edit</button>
            <button onClick={handleDelete} className="btn-danger"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Stats + history */}
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard icon={Calendar} label="Total visits"   value={m.visits} accent="brand" />
            <StatCard icon={Coins}    label="Lifetime spent" value={rupees(m.totalSpent)} accent="emerald" />
            <StatCard icon={Users}    label="Tier"           value={m.type}  accent="indigo" />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">Activity</div>
                <h3 className="text-lg font-extrabold mt-0.5">Booking history</h3>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier={m.type} />
                <StatusPill value={m.status} />
              </div>
            </div>
            {history.length === 0 ? (
              <EmptyState icon={Calendar} title="No bookings yet" message="This member hasn't booked any tables yet." />
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Table</th>
                      <th className="table-th">Time</th>
                      <th className="table-th">Players</th>
                      <th className="table-th text-right">Amount</th>
                      <th className="table-th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((b) => (
                      <tr key={b.id}>
                        <td className="table-td">{new Date(b.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="table-td">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-700 font-bold text-sm">
                            T{b.tableNumber}
                          </span>
                        </td>
                        <td className="table-td">{b.start} → {b.end}</td>
                        <td className="table-td">{b.players}</td>
                        <td className="table-td text-right font-bold">{rupees(b.amount)}</td>
                        <td className="table-td"><StatusPill value={b.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <MemberDialog open={editOpen} member={m} onClose={() => setEditOpen(false)} />
    </>
  );
}

function InfoLine({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-100 text-ink-500 flex items-center justify-center">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-ink-400 font-bold">{label}</div>
        <div className={['text-sm font-semibold text-ink-800 truncate', mono && 'font-mono'].filter(Boolean).join(' ')}>{value}</div>
      </div>
    </div>
  );
}
