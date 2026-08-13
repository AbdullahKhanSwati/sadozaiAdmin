import { useEffect, useMemo, useState } from 'react';
import {
  Boxes, Download, ChevronDown, ChevronRight, ChevronUp, RefreshCw, User, CalendarDays,
  Plus, Trash2, Tag, Package,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { supabaseBlockFactory } from '../../lib/supabaseBlockFactory.js';
import { csvDate } from '../../lib/csv.js';

const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDT = (ts) =>
  ts ? new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
const shortDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

export default function Stock() {
  const [counts, setCounts] = useState([]);
  const [itemsByCount, setItemsByCount] = useState({});
  const [names, setNames] = useState({});         // user_id -> name
  const [stockCats, setStockCats] = useState([]); // stock categories (ordered)
  const [stockItemsList, setStockItemsList] = useState([]); // stock items
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState('entries'); // 'entries' | 'manage'
  const [newCat, setNewCat] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: c }, { data: li }, { data: pr }, { data: cats }, { data: sit }] = await Promise.all([
      supabaseBlockFactory.from('stock_counts').select('*').order('counted_on', { ascending: false }).order('created_at', { ascending: false }),
      supabaseBlockFactory.from('stock_count_items').select('*').order('id', { ascending: true }),
      supabaseBlockFactory.from('profiles').select('user_id, name'),
      supabaseBlockFactory.from('stock_categories').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
      supabaseBlockFactory.from('stock_items').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    ]);
    const byCount = {};
    (li || []).forEach((r) => { (byCount[r.count_id] = byCount[r.count_id] || []).push(r); });
    const nm = {};
    (pr || []).forEach((p) => { nm[p.user_id] = p.name; });
    setCounts(c || []); setItemsByCount(byCount); setNames(nm);
    setStockCats(cats || []); setStockItemsList(sit || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // ---- Category + item management (staff stock catalog) --------------------
  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    const { error } = await supabaseBlockFactory.from('stock_categories').insert({ name });
    if (error) return window.alert(error.message);
    setNewCat(''); load();
  };
  const renameCategory = async (id, name) => {
    if (!name.trim()) return;
    await supabaseBlockFactory.from('stock_categories').update({ name: name.trim() }).eq('id', id);
    load();
  };
  const deleteCategory = async (id) => {
    if (!window.confirm('Delete this category? Its items will become uncategorised.')) return;
    await supabaseBlockFactory.from('stock_categories').delete().eq('id', id);
    load();
  };
  const addItem = async () => {
    const name = newItemName.trim();
    if (!name) return;
    const { error } = await supabaseBlockFactory.from('stock_items').insert({ name, category_id: newItemCat || null });
    if (error) return window.alert(error.message);
    setNewItemName(''); setNewItemCat(''); load();
  };
  const updateItem = async (id, patch) => {
    await supabaseBlockFactory.from('stock_items').update(patch).eq('id', id);
    load();
  };
  const deleteItem = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await supabaseBlockFactory.from('stock_items').delete().eq('id', id);
    load();
  };

  // Delete a whole stock check (e.g. a mistaken entry / a week's count).
  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this stock check? The entry and all its counts will be removed.')) return;
    await supabaseBlockFactory.from('stock_counts').delete().eq('id', id);
    setExpanded(null);
    load();
  };

  // Reorder categories / items — persist sort_order = position so the app's
  // screens and the exported Excel follow the same order.
  const moveCat = async (index, dir) => {
    const arr = [...stockCats];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setStockCats(arr.map((c, i) => ({ ...c, sort_order: i })));
    await Promise.all(arr.map((c, i) => supabaseBlockFactory.from('stock_categories').update({ sort_order: i }).eq('id', c.id)));
  };
  const moveItem = async (index, dir) => {
    const arr = [...stockItemsList];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setStockItemsList(arr.map((it, i) => ({ ...it, sort_order: i })));
    await Promise.all(arr.map((it, i) => supabaseBlockFactory.from('stock_items').update({ sort_order: i }).eq('id', it.id)));
  };

  const staffName = (id) => names[id] || 'Unknown';

  const filtered = useMemo(() => (counts || []).filter((c) => {
    if (from && (c.counted_on || '') < from) return false;
    if (to && (c.counted_on || '') > to) return false;
    return true;
  }), [counts, from, to]);

  const perStaff = useMemo(() => {
    const m = {};
    filtered.forEach((c) => { const k = c.created_by || 'unknown'; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m)
      .map(([k, v]) => ({ name: staffName(k), count: v }))
      .sort((a, b) => b.count - a.count);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, names]);

  // Export the filtered entries as a styled Excel sheet, grouped by category
  // (merged, colour-coded column A) — same layout as the Block Factory app.
  const exportXlsx = () => {
    if (!filtered.length) return;
    const entries = [...filtered].reverse(); // oldest → newest columns
    const dateCols = entries.map((c) => `${shortDate(c.counted_on)} (${staffName(c.created_by)})`);
    const maps = entries.map((c) => Object.fromEntries((itemsByCount[c.id] || []).map((li) => [li.stock_item_id || li.item_name, li.quantity])));

    // Group stock items by category (uncategorized last).
    const byCat = {};
    stockItemsList.forEach((it) => { const k = it.category_id || '__none'; (byCat[k] = byCat[k] || []).push(it); });
    const groups = stockCats.map((cat) => ({ name: cat.name, items: byCat[cat.id] || [] }));
    if ((byCat.__none || []).length) groups.push({ name: 'Uncategorized', items: byCat.__none });
    const withItems = groups.filter((g) => g.items.length);
    if (!withItems.length) return;

    const PALETTE = ['FCE4D6', 'DDEBF7', 'E2EFDA', 'FFF2CC', 'EAD1DC', 'D9E1F2', 'FDE9D9'];
    const HEADER_FILL = 'E8873A';
    const bd = { style: 'thin', color: { rgb: 'BFBFBF' } };
    const borders = { top: bd, bottom: bd, left: bd, right: bd };

    const aoa = [['Block Factory', '', ...dateCols]];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    const catFill = {};
    let r = 1;
    withItems.forEach((g, gi) => {
      const fill = PALETTE[gi % PALETTE.length];
      const start = r;
      g.items.forEach((it, idx) => {
        aoa.push([idx === 0 ? g.name : '', it.name, ...maps.map((m) => (it.id in m ? m[it.id] : ''))]);
        catFill[r] = fill; r += 1;
      });
      if (g.items.length) merges.push({ s: { r: start, c: 0 }, e: { r: r - 1, c: 0 } });
    });

    const nCols = 2 + dateCols.length;
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [{ wch: 16 }, { wch: 24 }, ...dateCols.map(() => ({ wch: 14 }))];
    for (let R = 0; R < aoa.length; R += 1) {
      for (let C = 0; C < nCols; C += 1) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        const s = { border: borders, alignment: { vertical: 'center', wrapText: true, horizontal: C === 1 ? 'left' : 'center' } };
        if (R === 0) { s.fill = { fgColor: { rgb: HEADER_FILL } }; s.font = { bold: true, color: { rgb: 'FFFFFF' } }; }
        else if (C === 0) { s.fill = { fgColor: { rgb: catFill[R] || 'FFFFFF' } }; s.font = { bold: true }; }
        ws[ref].s = s;
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock');
    XLSX.writeFile(wb, `block-factory-stock-${csvDate()}.xlsx`);
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink-800">Stock checker</h2>
            <p className="text-sm text-ink-500">Stock counts entered by staff</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-ink-600 hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={exportXlsx} disabled={!filtered.length} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700 disabled:opacity-40">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[['entries', 'Entries'], ['manage', 'Items & categories']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={['px-4 py-2 rounded-lg text-sm font-semibold', tab === k ? 'bg-bf-600 text-white' : 'bg-white border border-slate-200 text-ink-600 hover:bg-slate-50'].join(' ')}>{label}</button>
        ))}
      </div>

      {tab === 'manage' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Categories */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4"><Tag className="w-5 h-5 text-bf-600" /><h3 className="font-bold text-ink-800">Categories</h3></div>
            <div className="flex gap-2 mb-3">
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} placeholder="New category name" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <button onClick={addCategory} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700"><Plus className="w-4 h-4" /> Add</button>
            </div>
            {stockCats.length === 0 ? <p className="text-sm text-ink-400">No categories yet.</p> : stockCats.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2 py-2 border-t border-slate-100">
                <ReorderBtns onUp={() => moveCat(i, -1)} onDown={() => moveCat(i, 1)} first={i === 0} last={i === stockCats.length - 1} />
                <input defaultValue={c.name} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== c.name) renameCategory(c.id, v); }} className="flex-1 border-b border-transparent hover:border-slate-200 focus:border-bf-500 bg-transparent py-1 text-sm text-ink-800 focus:outline-none" />
                <button onClick={() => deleteCategory(c.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>

          {/* Items */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4"><Package className="w-5 h-5 text-bf-600" /><h3 className="font-bold text-ink-800">Items</h3></div>
            <div className="flex flex-wrap gap-2 mb-3">
              <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} placeholder="New item name" className="flex-1 min-w-[150px] border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <select value={newItemCat} onChange={(e) => setNewItemCat(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">No category</option>
                {stockCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button onClick={addItem} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-bf-600 text-white text-sm font-semibold hover:bg-bf-700"><Plus className="w-4 h-4" /> Add</button>
            </div>
            {stockItemsList.length === 0 ? <p className="text-sm text-ink-400">No items yet.</p> : stockItemsList.map((it, i) => (
              <div key={it.id} className="flex items-center gap-2 py-2 border-t border-slate-100">
                <ReorderBtns onUp={() => moveItem(i, -1)} onDown={() => moveItem(i, 1)} first={i === 0} last={i === stockItemsList.length - 1} />
                <input defaultValue={it.name} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== it.name) updateItem(it.id, { name: v }); }} className="flex-1 min-w-0 border-b border-transparent hover:border-slate-200 focus:border-bf-500 bg-transparent py-1 text-sm text-ink-800 focus:outline-none" />
                <select value={it.category_id || ''} onChange={(e) => updateItem(it.id, { category_id: e.target.value || null })} className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-ink-600">
                  <option value="">No category</option>
                  {stockCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => deleteItem(it.id)} className="text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <>
      {/* Date filter */}
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
          <button onClick={() => { setFrom(''); setTo(''); }} className="text-sm font-semibold text-bf-600 hover:text-bf-700 py-2">Clear</button>
        )}
        <div className="ml-auto flex items-center gap-2 text-sm text-ink-600">
          <CalendarDays className="w-4 h-4 text-ink-400" />
          <span className="font-bold text-ink-800">{filtered.length}</span> entries
        </div>
      </div>

      {/* Per-staff summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {perStaff.length === 0 ? (
          <div className="text-sm text-ink-400">No entries in this range.</div>
        ) : perStaff.map((s) => (
          <div key={s.name} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bf-100 text-bf-700 flex items-center justify-center"><User className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-ink-800 truncate">{s.name}</div>
              <div className="text-xs text-ink-400">Staff</div>
            </div>
            <div className="text-2xl font-extrabold text-bf-700">{s.count}</div>
          </div>
        ))}
      </div>

      {/* Entries table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_auto_40px] gap-2 px-4 py-3 border-b border-slate-100 text-[11px] uppercase tracking-widest font-bold text-ink-400">
          <span>Date</span><span>Staff</span><span className="text-right">Items</span><span />
        </div>
        {loading ? (
          <div className="p-8 text-center text-ink-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-ink-400">No stock entries.</div>
        ) : filtered.map((c) => {
          const lines = itemsByCount[c.id] || [];
          const open = expanded === c.id;
          return (
            <div key={c.id} className="border-b border-slate-50 last:border-b-0">
              <button
                onClick={() => setExpanded(open ? null : c.id)}
                className="w-full grid grid-cols-[1fr_1fr_auto_40px] gap-2 px-4 py-3 items-center text-left hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-ink-800">{fmtDate(c.counted_on)}</div>
                  <div className="text-[11px] text-ink-400">Added {fmtDT(c.created_at)}</div>
                </div>
                <div className="text-ink-700">{staffName(c.created_by)}</div>
                <div className="text-right font-bold text-ink-800">{lines.length}</div>
                <div className="flex justify-end text-ink-400">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</div>
              </button>
              {open && (
                <div className="bg-slate-50/60 px-4 pb-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 py-3">
                    {lines.map((li) => (
                      <div key={li.id} className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
                        <span className="text-ink-600 truncate pr-2">{li.item_name}</span>
                        <span className="font-bold text-ink-800">{li.quantity}</span>
                      </div>
                    ))}
                    {lines.length === 0 && <div className="text-sm text-ink-400">No items recorded.</div>}
                  </div>
                  <button onClick={() => deleteEntry(c.id)} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    <Trash2 className="w-4 h-4" /> Delete this stock check
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </>
      )}
    </div>
  );
}

// Up/down reorder controls for a list row.
function ReorderBtns({ onUp, onDown, first, last }) {
  return (
    <div className="flex flex-col shrink-0 -my-1">
      <button onClick={onUp} disabled={first} className="text-slate-400 hover:text-bf-600 disabled:opacity-25 disabled:hover:text-slate-400 leading-none" title="Move up">
        <ChevronUp className="w-4 h-4" />
      </button>
      <button onClick={onDown} disabled={last} className="text-slate-400 hover:text-bf-600 disabled:opacity-25 disabled:hover:text-slate-400 leading-none" title="Move down">
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}
