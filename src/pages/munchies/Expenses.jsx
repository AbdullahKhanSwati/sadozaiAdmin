import { useEffect, useMemo, useState } from 'react';
import { Wallet, Plus, Trash2, Download, RefreshCw, Pencil, X } from 'lucide-react';
import { supabaseMunchies as sb } from '../../lib/supabaseMunchies.js';
import { rs } from '../../data/munchiesData.js';
import { downloadCsv, csvDate } from '../../lib/csv.js';

const CATEGORIES = ['Ingredients', 'Salaries', 'Rent', 'Utilities', 'Repair', 'Other'];
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const EMPTY = { id: null, spent_on: today(), category: 'Ingredients', amount: '', description: '' };

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [form, setForm] = useState(null); // null = closed, else EMPTY or an existing row
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from('expenses').select('*')
      .order('spent_on', { ascending: false }).order('created_at', { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((e) => {
    if (from && (e.spent_on || '') < from) return false;
    if (to && (e.spent_on || '') > to) return false;
    return true;
  }), [rows, from, to]);

  const total = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const openNew = () => setForm({ ...EMPTY, spent_on: today() });
  const openEdit = (e) => setForm({ id: e.id, spent_on: e.spent_on || today(), category: e.category || 'Other', amount: String(e.amount ?? ''), description: e.description || '' });

  const save = async () => {
    if (!form.amount || !String(form.description).trim()) return window.alert('Amount and description are required.');
    setSaving(true);
    const payload = {
      spent_on: form.spent_on || today(),
      category: form.category || 'Other',
      amount: Number(form.amount) || 0,
      description: form.description.trim(),
    };
    let error;
    if (form.id) ({ error } = await sb.from('expenses').update(payload).eq('id', form.id));
    else ({ error } = await sb.from('expenses').insert(payload));
    setSaving(false);
    if (error) return window.alert(error.message);
    setForm(null);
    load();
  };

  const del = async (e) => {
    if (!window.confirm(`Delete "${e.description}"?`)) return;
    await sb.from('expenses').delete().eq('id', e.id);
    load();
  };

  const onExport = () => downloadCsv(`munchies-expenses-${csvDate()}.csv`, [
    { label: 'Date', value: (e) => fmtDate(e.spent_on) },
    { label: 'Category', value: 'category' },
    { label: 'Amount', value: (e) => Number(e.amount) || 0 },
    { label: 'Description', value: 'description' },
  ], filtered);

  return (
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink-800">Expenses</h2>
            <p className="text-sm text-ink-500">Costs logged from the app and here</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={onExport} disabled={!filtered.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-600 hover:bg-slate-50 disabled:opacity-40">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={openNew} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-mun-600 text-white text-sm font-semibold hover:bg-mun-700">
            <Plus className="w-4 h-4" /> Add expense
          </button>
        </div>
      </div>

      {/* Total + date filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-widest font-bold text-ink-400 mb-1">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-widest font-bold text-ink-400 mb-1">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }} className="text-sm font-semibold text-mun-600 hover:text-mun-700 py-2">Clear</button>
        )}
        <div className="ml-auto text-right">
          <div className="text-[11px] uppercase tracking-widest font-bold text-ink-400">Total ({filtered.length})</div>
          <div className="text-2xl font-extrabold text-rose-600">{rs(total)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_80px] gap-2 px-4 py-3 border-b border-slate-100 text-[11px] uppercase tracking-widest font-bold text-ink-400">
          <span>Date / Category</span><span>Description</span><span className="text-right">Amount</span><span />
        </div>
        {loading ? (
          <div className="p-8 text-center text-ink-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-ink-400">No expenses logged.</div>
        ) : filtered.map((e) => (
          <div key={e.id} className="grid grid-cols-[1fr_1fr_auto_80px] gap-2 px-4 py-3 items-center border-b border-slate-50 last:border-b-0 hover:bg-slate-50/60">
            <div>
              <div className="font-semibold text-ink-800">{fmtDate(e.spent_on)}</div>
              <div className="text-[11px] text-ink-400">{e.category}</div>
            </div>
            <div className="text-ink-700 truncate pr-2">{e.description}</div>
            <div className="text-right font-bold text-rose-600 whitespace-nowrap">- {rs(e.amount)}</div>
            <div className="flex justify-end gap-1">
              <button onClick={() => openEdit(e)} className="text-slate-400 hover:text-mun-600 p-1"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(e)} className="text-slate-400 hover:text-rose-500 p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / edit modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={() => setForm(null)}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="text-lg font-bold text-ink-800">{form.id ? 'Edit expense' : 'Add expense'}</div>
              <button onClick={() => setForm(null)} className="text-ink-400 hover:text-ink-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-ink-400 mb-1">Date</label>
                <input type="date" value={form.spent_on} onChange={(e) => setForm((f) => ({ ...f, spent_on: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Amount (Rs)</label>
                <input inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-ink-400 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="What was this expense for?" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
              <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold text-ink-500 hover:text-ink-700">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-mun-600 text-white text-sm font-semibold hover:bg-mun-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
