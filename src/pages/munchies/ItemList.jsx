import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Card, PrimaryBtn, TextBtn, CheckBox } from './catalogUi.jsx';
import { Panel, usePagination, TablePagination } from './munchiesUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { rs } from '../../data/munchiesData.js';
import { downloadCsv, parseCsv, csvDate } from '../../lib/csv.js';

export default function ItemList() {
  const navigate = useNavigate();
  const { items, categories, categoryName, saveItem, deleteItems } = useMunchies();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState([]);
  const [sortDir, setSortDir] = useState('asc');
  const fileRef = useRef(null);

  const catByName = (name) => categories.find((c) => c.name.toLowerCase() === (name || '').toLowerCase());

  const filtered = items
    .filter((i) => (cat === 'all' ? true : i.categoryId === cat))
    .filter((i) => `${i.code} ${i.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const cmp = `${a.name}`.localeCompare(`${b.name}`, undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const onExport = () => downloadCsv(`munchies-items-${csvDate()}.csv`,
    [
      { label: 'Code', value: 'code' }, { label: 'Name', value: 'name' },
      { label: 'Category', value: (r) => categoryName(r.categoryId) },
      { label: 'Price', value: 'price' }, { label: 'Cost', value: 'cost' },
      { label: 'SKU', value: 'sku' }, { label: 'Barcode', value: 'barcode' },
    ], items);

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    for (const r of rows) {
      const name = r.Name || r.name;
      if (!name) continue;
      await saveItem({
        code: r.Code || r.code || '', name,
        categoryId: catByName(r.Category || r.category)?.id || '',
        price: Number(r.Price || r.price) || 0, cost: Number(r.Cost || r.cost) || 0,
        sku: r.SKU || r.sku || '', barcode: r.Barcode || r.barcode || '',
        availableForSale: true, soldBy: 'Each', modifiers: [], variants: [],
        color: '#BDBDBD', shape: 'square',
      });
    }
    e.target.value = '';
  };

  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(filtered, 10);

  const allChecked = pageItems.length > 0 && pageItems.every((i) => selected.includes(i.id));
  const toggleAll = () =>
    setSelected(allChecked ? selected.filter((id) => !pageItems.some((i) => i.id === id)) : [...new Set([...selected, ...pageItems.map((i) => i.id)])]);
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const margin = (i) => (i.price > 0 ? `${Math.round(((i.price - i.cost) / i.price) * 100)}%` : '—');

  return (
    <div className="max-w-[1400px] mx-auto">
      <Card>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/munchies/items/new')}>+ Add item</PrimaryBtn>
          <TextBtn onClick={() => fileRef.current?.click()}>Import</TextBtn>
          <TextBtn onClick={onExport}>Export</TextBtn>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
          {selected.length > 0 && (
            <button
              onClick={async () => {
                if (!window.confirm(`Delete ${selected.length} item(s)?`)) return;
                try { await deleteItems(selected); setSelected([]); } catch (e) { window.alert(e?.message || 'Delete failed.'); }
              }}
              className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600"
            >
              <Trash2 className="w-4 h-4" /> Delete ({selected.length})
            </button>
          )}

          <div className="flex-1" />

          <label className="flex flex-col text-xs text-ink-400">
            Category
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="mt-1 border-b border-slate-300 bg-transparent py-1 text-sm text-ink-700 focus:outline-none focus:border-mun-500 min-w-[140px]">
              <option value="all">All items</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col text-xs text-ink-400">
            Stock alert
            <select className="mt-1 border-b border-slate-300 bg-transparent py-1 text-sm text-ink-700 focus:outline-none focus:border-mun-500 min-w-[120px]">
              <option>All items</option>
              <option>Low stock</option>
              <option>Out of stock</option>
            </select>
          </label>

          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-mun-500/30 focus:border-mun-400 w-44" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="px-5 py-3 w-10"><CheckBox checked={allChecked} onChange={toggleAll} /></th>
                <th className="text-left font-medium px-2 py-3">
                  <button onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))} className="inline-flex items-center gap-1 hover:text-ink-700">
                    Item name
                    {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-mun-600" /> : <ArrowDown className="w-3.5 h-3.5 text-mun-600" />}
                  </button>
                </th>
                <th className="text-left font-medium px-5 py-3">Category</th>
                <th className="text-right font-medium px-5 py-3">Price</th>
                <th className="text-right font-medium px-5 py-3">Cost</th>
                <th className="text-right font-medium px-5 py-3">Margin</th>
                <th className="text-right font-medium px-5 py-3">In stock</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((i) => (
                <tr key={i.id} onClick={() => navigate(`/munchies/items/${i.id}`)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                  <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}><CheckBox checked={selected.includes(i.id)} onChange={() => toggleOne(i.id)} /></td>
                  <td className="px-2 py-4 text-ink-700">{i.code} {i.name}</td>
                  <td className="px-5 py-4 text-ink-600">{categoryName(i.categoryId)}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(i.price)}</td>
                  <td className="px-5 py-4 text-right text-ink-500">{rs(i.cost)}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{margin(i)}</td>
                  <td className="px-5 py-4 text-right text-ink-400">—</td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-ink-400">No items found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <TablePagination page={page} pageCount={pageCount} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} />
        )}
      </Card>
    </div>
  );
}
