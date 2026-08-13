import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { Card, PrimaryBtn, TextBtn } from './catalogUi.jsx';
import { usePagination, TablePagination } from './bfUi.jsx';
import { useBlockFactory } from '../../store/BlockFactoryStore.jsx';
import { rs } from '../../data/munchiesData.js';
import { downloadCsv, parseCsv, csvDate } from '../../lib/csv.js';

const EMPTY_STAT = { visits: 0, spent: 0, firstVisit: null, lastVisit: null };
const fmtDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

export default function CustomerList() {
  const navigate = useNavigate();
  const { customers, saveCustomer, reports, customerBalance, totalOutstanding } = useBlockFactory();
  const [q, setQ] = useState('');
  const fileRef = useRef(null);

  // Visits + total spent are derived from real receipts (the stored columns are
  // not maintained by the app), matching what the mobile app shows.
  const stat = (c) => reports.customerStats?.[c.id] || EMPTY_STAT;

  const onExport = () => downloadCsv(`block-factory-customers-${csvDate()}.csv`,
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
      { label: 'Billed', value: (c) => customerBalance(c.id).billed },
      { label: 'Paid', value: (c) => customerBalance(c.id).paid },
      { label: 'Outstanding', value: (c) => Math.max(0, customerBalance(c.id).balance) },
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

  // Debtors first (largest balance), then everyone else by name — the same
  // ordering the app's Customers screen uses.
  const filtered = customers
    .filter((c) => `${c.name || 'unknown'} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const d = customerBalance(b.id).balance - customerBalance(a.id).balance;
      return d !== 0 ? d : (a.name || '').localeCompare(b.name || '');
    });
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(filtered, 10);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Receivables headline — what the whole customer base still owes. */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-bf-50 border border-bf-200 px-5 py-3">
        <span className="text-sm font-semibold text-bf-700">Total outstanding</span>
        <span className={['text-xl font-extrabold', totalOutstanding > 0 ? 'text-rose-600' : 'text-bf-700'].join(' ')}>
          {rs(totalOutstanding)}
        </span>
        <div className="flex-1" />
        <TextBtn onClick={() => navigate('/block-factory/reports/receivables')}>View receivables report</TextBtn>
      </div>

      <Card>
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/block-factory/customers/new')}>+ Add customer</PrimaryBtn>
          <TextBtn onClick={() => fileRef.current?.click()}>Import</TextBtn>
          <TextBtn onClick={onExport}>Export</TextBtn>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onImport} />
          <div className="flex-1" />
          <div className="relative flex items-center gap-2 min-w-[260px] border-b border-bf-500 pb-1">
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
                <th className="text-left font-medium px-5 py-3">Last visit</th>
                <th className="text-right font-medium px-5 py-3">Sales</th>
                <th className="text-right font-medium px-5 py-3">Billed</th>
                <th className="text-right font-medium px-5 py-3">Paid</th>
                <th className="text-right font-medium px-5 py-3">Outstanding</th>
                <th className="text-right font-medium px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => {
                const s = stat(c);
                const b = customerBalance(c.id);
                const owed = Math.max(0, b.balance);
                return (
                <tr key={c.id} onClick={() => navigate(`/block-factory/customers/${c.id}/statement`)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                  <td className="px-5 py-4 font-bold text-ink-800">{c.name || 'Unknown'}</td>
                  <td className="px-5 py-4 text-ink-600">{c.phone || c.email || '—'}</td>
                  <td className="px-5 py-4 text-ink-600">{fmtDate(s.lastVisit)}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{s.visits}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(b.billed)}</td>
                  <td className="px-5 py-4 text-right text-ink-600">{rs(b.paid)}</td>
                  <td className={['px-5 py-4 text-right font-bold', owed > 0 ? 'text-rose-600' : 'text-ink-400'].join(' ')}>
                    {rs(owed)}
                  </td>
                  <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <TextBtn onClick={() => navigate(`/block-factory/customers/${c.id}`)}>Edit</TextBtn>
                  </td>
                </tr>
                );
              })}
              {pageItems.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-400">No customers found.</td></tr>
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
