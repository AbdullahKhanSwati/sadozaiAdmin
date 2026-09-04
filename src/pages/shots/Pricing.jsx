import { useEffect, useMemo, useState } from 'react';
import {
  Check, Clock, Coins, Gamepad2, Plus, Tags, Timer, Trash2, Users,
} from 'lucide-react';
import { PageHeader, EmptyState, FilterChips } from '../../components/ui.jsx';
import { useShots } from '../../store/ShotsStore.jsx';
import { rupees } from '../../data/shotsData.js';
import { PRICING_MODES, rulesFor, tierLabel, unitSuffix } from '../../data/pricing.js';

/**
 * Pricing — one page per table type, three modes:
 *
 *   Per minute : pay as you play (a per-minute price + a minimum billed length)
 *   Per game   : a flat price per game, per player tier, each game time-capped
 *   Per hour   : a flat hourly price, per player tier
 *
 * Everything here is read live by the staff app's booking screen, so a price
 * change is visible on the floor immediately — no redeploy.
 */

const MODE_ICON = { minute: Timer, game: Gamepad2, hour: Clock };

const MODE_BLURB = {
  minute: 'Charged per minute played, with a minimum billed length.',
  game:   'A flat price per game. Each game is capped at the minutes you set.',
  hour:   'A flat price per hour — best value for long sessions.',
};

const blankRule = (tableType, mode) => ({
  tableType,
  mode,
  players: mode === 'minute' ? 0 : 2,
  memberPrice: '',
  nonMemberPrice: '',
  minMinutes: mode === 'minute' ? 10 : '',
  maxMinutes: mode === 'game' ? 30 : mode === 'hour' ? 60 : '',
  minPlayers: 1,
  maxPlayers: mode === 'minute' ? 2 : '',
  active: true,
});

export default function Pricing() {
  const { tables, tableTypes, pricingRules } = useShots();

  // Types come from the DB; anything already used by a table is included so no
  // table is ever left without a way to price it.
  const types = useMemo(() => {
    const names = [];
    tableTypes.forEach((t) => { if (t.name && !names.includes(t.name)) names.push(t.name); });
    tables.forEach((t) => { if (t.type && !names.includes(t.type)) names.push(t.type); });
    return names;
  }, [tableTypes, tables]);

  const [type, setType] = useState(types[0] || '');
  useEffect(() => {
    if (types.length && !types.includes(type)) setType(types[0]);
  }, [types, type]);

  if (types.length === 0) {
    return (
      <>
        <PageHeader title="Pricing" subtitle="Set what each table type costs, per minute, per game and per hour." />
        <EmptyState
          icon={Tags}
          title="No table types yet"
          message="Add your table types first (Tables → Manage types), then come back to price them."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pricing"
        subtitle="Set what each table type costs, per minute, per game and per hour. Staff see changes instantly."
      />

      <div className="card p-4 mb-4">
        <FilterChips
          value={type}
          onChange={setType}
          items={types.map((n) => ({
            value: n,
            label: n,
            count: pricingRules.filter((r) => r.tableType === n).length,
          }))}
        />
      </div>

      <div className="space-y-4">
        {PRICING_MODES.map((m) => (
          <ModeCard key={m.value} mode={m} tableType={type} />
        ))}
      </div>

      <p className="text-xs text-ink-500 mt-5">
        A booking uses the cheapest player tier that still fits the group — a 3-player game on a
        “2 players / 4 players” card is charged at the 4-player price. Table types with no prices
        here fall back to the per-table hourly rates set on the Tables page.
      </p>
    </>
  );
}

function ModeCard({ mode, tableType }) {
  const { pricingRules, addPricingRule } = useShots();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(() => blankRule(tableType, mode.value));
  const [err, setErr] = useState('');

  const rules = rulesFor(pricingRules, tableType, mode.value);
  const Icon = MODE_ICON[mode.value] || Coins;

  const startAdd = () => {
    setDraft(blankRule(tableType, mode.value));
    setErr('');
    setAdding(true);
  };

  const saveNew = async () => {
    setErr('');
    const players = Number(draft.players) || 0;
    if (rules.some((r) => Number(r.players) === players)) {
      return setErr(players === 0
        ? 'This mode already has a price for this table type.'
        : `A price for the ${players}-player tier already exists.`);
    }
    if (!Number(draft.memberPrice) && !Number(draft.nonMemberPrice)) {
      return setErr('Enter a price.');
    }
    try {
      await addPricingRule({
        ...draft,
        tableType,
        mode: mode.value,
        players,
        memberPrice: Number(draft.memberPrice) || 0,
        nonMemberPrice: Number(draft.nonMemberPrice) || Number(draft.memberPrice) || 0,
        minMinutes: draft.minMinutes === '' ? null : Number(draft.minMinutes),
        maxMinutes: draft.maxMinutes === '' ? null : Number(draft.maxMinutes),
        minPlayers: draft.minPlayers === '' ? null : Number(draft.minPlayers),
        maxPlayers: draft.maxPlayers === '' ? null : Number(draft.maxPlayers),
        sortOrder: rules.length + 1,
      });
      setAdding(false);
    } catch (e) {
      setErr(e?.message || 'Could not save this price.');
    }
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold">{mode.label}</h3>
            <p className="text-sm text-ink-500">{MODE_BLURB[mode.value]}</p>
          </div>
        </div>
        <button onClick={startAdd} className="btn-ghost shrink-0">
          <Plus className="w-4 h-4" /> Add price
        </button>
      </div>

      {rules.length === 0 && !adding && (
        <p className="text-sm text-ink-500 rounded-xl bg-slate-50 px-4 py-3">
          No {mode.label.toLowerCase()} price for {tableType} yet — this mode is hidden from staff
          when booking a {tableType} table.
        </p>
      )}

      <div className="space-y-2">
        {rules.map((r) => (
          <RuleRow key={r.id} rule={r} mode={mode} siblings={rules} />
        ))}
      </div>

      {adding && (
        <div className="mt-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 p-4">
          <RuleFields mode={mode} value={draft} onChange={(k, v) => setDraft((s) => ({ ...s, [k]: v }))} />
          {err && <div className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{err}</div>}
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setAdding(false)} className="btn-ghost">Cancel</button>
            <button onClick={saveNew} className="btn-primary"><Plus className="w-4 h-4" /> Add price</button>
          </div>
        </div>
      )}
    </div>
  );
}

function RuleRow({ rule, mode, siblings }) {
  const { updatePricingRule, deletePricingRule } = useShots();
  const [form, setForm] = useState(() => toForm(rule));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Re-sync when the row changes underneath us (realtime, another admin).
  useEffect(() => { setForm(toForm(rule)); }, [rule]);

  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(rule));

  const save = async () => {
    setErr('');
    setSaving(true);
    try {
      await updatePricingRule(rule.id, {
        players: Number(form.players) || 0,
        memberPrice: Number(form.memberPrice) || 0,
        nonMemberPrice: Number(form.nonMemberPrice) || 0,
        minMinutes: form.minMinutes === '' ? null : Number(form.minMinutes),
        maxMinutes: form.maxMinutes === '' ? null : Number(form.maxMinutes),
        minPlayers: form.minPlayers === '' ? null : Number(form.minPlayers),
        maxPlayers: form.maxPlayers === '' ? null : Number(form.maxPlayers),
        active: !!form.active,
      });
    } catch (e) {
      setErr(e?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    const what = tierLabel(rule, siblings) || mode.label.toLowerCase();
    if (confirm(`Delete the ${mode.label.toLowerCase()} price for ${what}? Bookings already taken keep the price they were charged.`)) {
      deletePricingRule(rule.id).catch((e) => setErr(e?.message || 'Could not delete.'));
    }
  };

  return (
    <div className={['rounded-2xl border p-4', form.active ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-70'].join(' ')}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-sm font-extrabold">
          <Users className="w-4 h-4 text-ink-400" />
          {tierLabel(rule, siblings) || 'Any number of players'}
          <span className="chip bg-slate-100 text-ink-600 font-bold">
            {rupees(rule.memberPrice)} {unitSuffix(mode.value)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-bold text-ink-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.active}
              onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))}
              className="accent-brand-600"
            />
            Active
          </label>
          <button onClick={remove} className="btn-danger px-2.5 py-1.5 text-xs"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <RuleFields mode={mode} value={form} onChange={(k, v) => setForm((s) => ({ ...s, [k]: v }))} />

      {err && <div className="mt-3 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">{err}</div>}

      {dirty && (
        <div className="flex justify-end mt-3">
          <button onClick={save} disabled={saving} className="btn-primary px-3 py-1.5 text-xs">
            <Check className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </div>
  );
}

/** The editable fields of one price option — shared by the add form and rows. */
function RuleFields({ mode, value, onChange }) {
  const isMinute = mode.value === 'minute';
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <NumField
        label={isMinute ? 'Player tier (0 = any)' : 'Players (up to)'}
        value={value.players}
        onChange={(v) => onChange('players', v)}
        hint={isMinute ? 'Per-minute is normally not player-based' : 'e.g. 2 or 4'}
      />
      <NumField
        label={`Member price (Rs ${unitSuffix(mode.value)})`}
        value={value.memberPrice}
        onChange={(v) => onChange('memberPrice', v)}
      />
      <NumField
        label={`Non-member price (Rs ${unitSuffix(mode.value)})`}
        value={value.nonMemberPrice}
        onChange={(v) => onChange('nonMemberPrice', v)}
        hint="Same as member price if you don't split them"
      />
      {mode.value === 'minute' && (
        <NumField
          label="Minimum minutes"
          value={value.minMinutes}
          onChange={(v) => onChange('minMinutes', v)}
          hint="Shorter sessions are billed at this"
        />
      )}
      {mode.value === 'game' && (
        <NumField
          label="Minutes per game"
          value={value.maxMinutes}
          onChange={(v) => onChange('maxMinutes', v)}
          hint="How long one game may run"
        />
      )}
      {mode.value === 'hour' && (
        <NumField
          label="Minutes per unit"
          value={value.maxMinutes}
          onChange={(v) => onChange('maxMinutes', v)}
          hint="60 for a standard hour"
        />
      )}
      <NumField
        label="Min players allowed"
        value={value.minPlayers}
        onChange={(v) => onChange('minPlayers', v)}
        hint="Blank = no minimum"
      />
      <NumField
        label="Max players allowed"
        value={value.maxPlayers}
        onChange={(v) => onChange('maxPlayers', v)}
        hint="Blank = no limit"
      />
    </div>
  );
}

function NumField({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type="number"
        min="0"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-[11px] text-ink-400 mt-1">{hint}</p>}
    </div>
  );
}

function toForm(r) {
  const n = (v) => (v == null ? '' : String(v));
  return {
    players: n(r.players ?? 0),
    memberPrice: n(r.memberPrice ?? 0),
    nonMemberPrice: n(r.nonMemberPrice ?? 0),
    minMinutes: n(r.minMinutes),
    maxMinutes: n(r.maxMinutes),
    minPlayers: n(r.minPlayers),
    maxPlayers: n(r.maxPlayers),
    active: r.active !== false,
  };
}
