import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Crown, Diamond, Download, Edit3, Filter, Layers, QrCode, Search, Shield, Sparkles,
  Star, UserPlus, Users,
} from 'lucide-react';
import { rupees } from '../../data/shotsData.js';
import {
  EmptyState, FilterChips, PageHeader, StatCard, StatusPill, TierBadge,
} from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import MemberDialog from '../../components/dialogs/MemberDialog.jsx';
import TiersDialog from '../../components/dialogs/TiersDialog.jsx';
import MembershipVirtualCard from '../../components/MembershipVirtualCard.jsx';

const TIER_ICONS = { crown: Crown, star: Star, shield: Shield, diamond: Diamond, sparkles: Sparkles, award: Award };

export default function Memberships() {
  const { members, tiers } = useShots();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [memberDialog, setMemberDialog] = useState({ open: false, member: null });
  const [tiersOpen, setTiersOpen] = useState(false);
  const [previewMember, setPreviewMember] = useState(null);

  const FILTERS = useMemo(() => [
    { value: 'All',     label: 'All',     count: members.length },
    { value: 'Active',  label: 'Active',  count: members.filter((m) => m.status === 'Active').length },
    { value: 'Expired', label: 'Expired', count: members.filter((m) => m.status === 'Expired').length },
    ...tiers.map((t) => ({ value: t.tier, label: t.tier })),
  ], [members, tiers]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const matchQ = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.phone || '').includes(q);
      const matchF = filter === 'All' || m.status === filter || m.type === filter;
      return matchQ && matchF;
    });
  }, [members, query, filter]);

  const active = members.filter((m) => m.status === 'Active').length;
  const expired = members.filter((m) => m.status === 'Expired').length;
  const premium = members.filter((m) => m.type === 'Premium').length;

  return (
    <>
      <PageHeader
        title="Memberships"
        subtitle="Manage members, card tiers, expiry & lifetime value."
        actions={
          <>
            <button onClick={() => setTiersOpen(true)} className="btn-ghost"><Layers className="w-4 h-4" /> Manage tiers</button>
            <button className="btn-ghost"><QrCode className="w-4 h-4" /> Scan QR</button>
            <button className="btn-ghost"><Download className="w-4 h-4" /> Export</button>
            <button onClick={() => setMemberDialog({ open: true, member: null })} className="btn-primary">
              <UserPlus className="w-4 h-4" /> Add member
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total members" value={members.length} sub="All time" accent="brand" />
        <StatCard icon={Award} label="Active"        value={active}        sub="Renewed & valid" accent="emerald" />
        <StatCard icon={Award} label="Expired"       value={expired}       sub="Need renewal" accent="rose" />
        <StatCard icon={Crown} label="Premium tier"  value={premium}       sub="Top spenders" accent="indigo" />
      </div>

      {/* Tier benefits — from live store */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {tiers.map((t) => {
          const Icon = TIER_ICONS[t.icon] || Award;
          const memberCount = members.filter((m) => m.type === t.tier).length;
          return (
            <div key={t.id} className="card p-5 relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-30" style={{ background: `${t.color}33` }} />
              <div className="relative flex items-center gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-xl text-white flex items-center justify-center shadow-soft"
                  style={{ backgroundColor: t.color }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-extrabold text-lg">{t.tier}</div>
                    <span className="chip bg-slate-100 text-ink-600">{memberCount} member{memberCount === 1 ? '' : 's'}</span>
                  </div>
                  <div className="text-[12px] text-ink-500">{rupees(t.monthly)} / month</div>
                </div>
              </div>
              <ul className="space-y-1.5 text-[13px] text-ink-700">
                {(t.perks || []).map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 mt-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                    {p}
                  </li>
                ))}
                {t.perks?.length === 0 && (
                  <li className="text-xs text-ink-400 italic">No perks listed — click "Manage tiers" to add some.</li>
                )}
              </ul>
            </div>
          );
        })}
        <button
          onClick={() => setTiersOpen(true)}
          className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 hover:bg-brand-100/60 p-5 flex flex-col items-center justify-center text-brand-700 transition min-h-[180px]"
        >
          <Layers className="w-6 h-6 mb-2" />
          <div className="font-extrabold">Manage tier cards</div>
          <div className="text-xs text-ink-500 mt-1">Add a new tier, edit perks, set pricing</div>
        </button>
      </div>

      {/* Toolbar */}
      <div className="card p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              placeholder="Search by name, ID, or phone…"
              className="input pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <FilterChips value={filter} onChange={setFilter} items={FILTERS} />
          <button className="btn-ghost lg:ml-auto"><Filter className="w-4 h-4" /> More filters</button>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="No members" message="Try clearing search or filters." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="table-th">Member</th>
                  <th className="table-th">Tier</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Joined</th>
                  <th className="table-th">Expires</th>
                  <th className="table-th">Visits</th>
                  <th className="table-th text-right">Lifetime</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        {m.photo ? (
                          <img src={typeof m.photo === 'string' ? m.photo : ''} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-brand-gradient text-white font-bold flex items-center justify-center">
                            {m.name[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <button onClick={() => setPreviewMember(m)} className="font-semibold hover:text-brand-600 text-left">
                            {m.name}
                          </button>
                          <div className="text-[11px] text-ink-400 font-mono">{m.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td"><TierBadge tier={m.type} /></td>
                    <td className="table-td">{m.phone}</td>
                    <td className="table-td">{new Date(m.joinDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="table-td">{new Date(m.expiryDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="table-td">{m.visits}</td>
                    <td className="table-td text-right font-bold">{rupees(m.totalSpent)}</td>
                    <td className="table-td"><StatusPill value={m.status} /></td>
                    <td className="table-td text-right whitespace-nowrap">
                      <button
                        onClick={() => setPreviewMember(m)}
                        className="text-ink-500 hover:text-ink-700 text-xs font-bold mr-2"
                      >
                        <QrCode className="w-3.5 h-3.5 inline" /> Card
                      </button>
                      <button
                        onClick={() => setMemberDialog({ open: true, member: m })}
                        className="text-brand-600 hover:text-brand-700 text-xs font-bold mr-2"
                      >
                        <Edit3 className="w-3.5 h-3.5 inline" /> Edit
                      </button>
                      <Link to={`/admin/memberships/${m.id}`} className="text-ink-700 font-bold text-xs hover:text-brand-600">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MemberDialog
        open={memberDialog.open}
        member={memberDialog.member}
        onClose={() => setMemberDialog({ open: false, member: null })}
      />
      <TiersDialog open={tiersOpen} onClose={() => setTiersOpen(false)} />

      {/* Quick virtual-card preview */}
      {previewMember && (
        <div className="fixed inset-0 z-50 bg-ink-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewMember(null)}>
          <div className="w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <MembershipVirtualCard member={previewMember} />
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => setPreviewMember(null)} className="btn-ghost bg-white">Close</button>
              <button
                onClick={() => { const m = previewMember; setPreviewMember(null); setMemberDialog({ open: true, member: m }); }}
                className="btn-primary"
              >
                <Edit3 className="w-4 h-4" /> Edit member
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
