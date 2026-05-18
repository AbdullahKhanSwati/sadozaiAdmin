import { QRCodeSVG } from 'qrcode.react';
import { Crown, Shield, Star, Award } from 'lucide-react';

/**
 * Virtual membership card — mirrors the staff-app card 1:1.
 * Includes a real QR encoding the public-safe fields (id, name, type, exp).
 * `compact` is used in the live-preview slot of the Add/Edit Member dialog.
 */
export default function MembershipVirtualCard({ member, compact = false, className = '' }) {
  if (!member) return null;

  const Icon = { Premium: Crown, Standard: Star, Basic: Shield }[member.type] || Award;

  const qrPayload = JSON.stringify({
    id: member.id,
    name: member.name,
    type: member.type,
    exp: member.expiryDate,
  });

  const initials = (member.name || '?')
    .split(' ').filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase();

  const expiryFmt = formatExpiry(member.expiryDate);

  return (
    <div
      className={[
        'relative rounded-2xl overflow-hidden text-white shadow-pop',
        'bg-brand-dark border border-white/5',
        compact ? 'p-4' : 'p-5',
        className,
      ].join(' ')}
      style={{ minHeight: compact ? 190 : 220 }}
    >
      {/* ambient glows */}
      <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-brand-500/20 blur-xl pointer-events-none" />
      <div className="absolute -bottom-28 -left-24 w-56 h-56 rounded-full bg-brand-900/50 blur-xl pointer-events-none" />

      <div className="relative flex flex-col h-full">
        {/* Top row — brand + tier */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xl font-black tracking-[4px]">SHOTS</div>
            <div className="text-[10px] uppercase tracking-widest text-white/60 mt-0.5">Members Club</div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200">
            <Icon className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-widest font-bold">{member.type || 'Member'}</span>
          </div>
        </div>

        {/* Middle — photo, info, QR */}
        <div className="flex items-center gap-3 mt-4">
          <div className="shrink-0">
            {member.photo ? (
              <img
                src={typeof member.photo === 'string' ? member.photo : URL.createObjectURL(member.photo)}
                alt=""
                className="w-16 h-16 rounded-xl border-2 border-white/20 object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-white/20 bg-white/10 flex items-center justify-center text-2xl font-black">
                {initials}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-white/55 font-bold">Member</div>
            <div className="text-base font-bold uppercase truncate leading-tight">{member.name || 'NEW MEMBER'}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white/55 font-bold">ID No.</div>
                <div className="text-xs font-bold font-mono tracking-wider">{member.id || 'A------'}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase tracking-widest text-white/55 font-bold">Valid Thru</div>
                <div className="text-xs font-bold">{expiryFmt}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="bg-white rounded-md p-1">
              <QRCodeSVG value={qrPayload} size={compact ? 56 : 68} includeMargin={false} />
            </div>
            <div className="text-[8px] tracking-[2px] text-white/70 font-extrabold mt-1">SCAN</div>
          </div>
        </div>

        {/* Bottom — issuer + status */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
          <div className="min-w-0">
            <div className="text-[9px] uppercase tracking-widest text-white/55 font-bold">Membership</div>
            <div className="text-xs font-bold truncate">Issued by Shots Club</div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15">
            <span
              className={[
                'w-1.5 h-1.5 rounded-full',
                member.status === 'Active' ? 'bg-emerald-400' : 'bg-rose-400',
              ].join(' ')}
            />
            <span className="text-[10px] uppercase tracking-widest font-bold">{member.status || 'Active'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatExpiry(date) {
  if (!date) return '--/--';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--/--';
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
}
