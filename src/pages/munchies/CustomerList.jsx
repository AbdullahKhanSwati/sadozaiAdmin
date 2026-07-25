import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Card, PrimaryBtn, TextBtn } from './catalogUi.jsx';
import { usePagination, TablePagination } from './munchiesUi.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { rs } from '../../data/munchiesData.js';
import { downloadCsv, parseCsv, csvDate } from '../../lib/csv.js';

const EMPTY_STAT = { visits: 0, spent: 0, firstVisit: null, lastVisit: null };
const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function CustomerList() {
  const navigate = useNavigate();
  const { customers, saveCustomer, reports } = useMunchies();
  const [q, setQ] = useState('');
  const fileRef = useRef(null);

  // Visits + total spent are derived from real receipts (the stored columns are
  // not maintained by the app), matching what the mobile app shows.
  const stat = (c) => reports.customerStats?.[c.id] || EMPTY_STAT;

  const onExport = () => downloadCsv(`munchies-customers-${csvDate()}.csv`,
    [
      { label: 'Customer id', value: 'id' },
      { label: 'Customer name', value: (c) => c.name || 'Unknown' },
      { label: 'Email', value: 'email' },
      { label: 'Phone', value: 'phone' },
      { label: 'Address', value: 'address' },
      { label: 'City', value: 'city' },
      { label: 'Region', value: 'region' },
      { label: 'Postal code', value: 'postalCode' },
      { label: 'Country', value: 'country' },
      { label: 'Note', value: 'note' },
      { label: 'First visit', value: (c) => fmtDate(stat(c).firstVisit) },
      { label: 'Last visit', value: (c) => fmtDate(stat(c).lastVisit) },
      { label: 'Total visits', value: (c) => stat(c).visits },
      { label: 'Total spent', value: (c) => stat(c).spent },
    ], customers);

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    for (const r of rows) {
      const name = r.Name || r.name;
      const phone = r.Phone || r.phone;
      const email = r.Email || r.email;
      if (!name && !phone && !email) continue;
      await saveCustomer({
        name: name || '', email: email || '', phone: phone || '', city: r.City || r.city || '',
        visits: Number(r['Total visits'] || r.visits) || 0, spent: Number(r['Total spent'] || r.spent) || 0,
        points: Number(r.Points || r.points) || 0,
      });
    }
    e.target.value = '';
  };

  const filtered = customers.filter((c) =>
    `${c.name || 'unknown'} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase())
  );
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(filtered, 10);

  return (
    <div className="max-w-[1400px] mx-auto">
      <Card>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/munchies/customers/new')}>+ Add customer</PrimaryBtn>
          <TextBtn onClick={() => fileRef.current?.click()}>Import</TextBtn>
          <TextBtn onClick={onExport}>Export</TextBtn>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
          <div className="flex-1" />
          <div className="relative flex items-center gap-2 min-w-[260px] border-b border-mun-500 pb-1">
            <Search className="w-5 h-5 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email" className="flex-1 bg-transparent text-sm text-ink-800 placeholder:text-slate-400 focus:outline-none" />
            {q && <button onClick={() => setQ('')} className="text-ink-400 hover:text-ink-600"><X className="w-4 h-4" /></button>}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Customer</th>
                <th className="text-left font-medium px-5 py-3">Contacts</th>
                <th className="text-left font-medium px-5 py-3">First visit</th>
                <th className="text-left font-medium px-5 py-3">Last visit</th>
                <th className="text-right font-medium px-5 py-3">Total visits</th>
                <th className="text-right font-medium px-5 py-3">Total spent</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => {
                const s = stat(c);
                return (
                <tr key={c.id} onClick={() => navigate(`/munchies/customers/${c.id}`)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                  <td className="px-5 py-4 font-bold text-ink-800">{c.name || 'Unknown'}</td>
                  <td className="px-5 py-4 text-ink-600">{c.phone || c.email || '—'}</td>
                  <td className="px-5 py-4 text-ink-600">{fmtDate(s.firstVisit)}</td>
                  <td className="px-5 py-4 text-ink-600">{fmtDate(s.lastVisit)}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{s.visits}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(s.spent)}</td>
                </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-400">No customers found.</td></tr>
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
