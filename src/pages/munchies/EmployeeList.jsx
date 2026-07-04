import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { Card, PrimaryBtn, CheckBox } from './catalogUi.jsx';
import { usePagination, TablePagination } from './munchiesUi.jsx';
import EmployeeBanner from './EmployeeBanner.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';

export default function EmployeeList() {
  const navigate = useNavigate();
  const { employees, roleName, deleteEmployees } = useMunchies();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState([]);

  const filtered = employees.filter((e) =>
    `${e.name} ${e.email} ${e.phone}`.toLowerCase().includes(q.toLowerCase())
  );
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(filtered, 10);

  const allChecked = pageItems.length > 0 && pageItems.every((e) => selected.includes(e.id));
  const toggleAll = () =>
    setSelected(allChecked ? selected.filter((id) => !pageItems.some((e) => e.id === id)) : [...new Set([...selected, ...pageItems.map((e) => e.id)])]);
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="max-w-[1200px] mx-auto">
      <EmployeeBanner />

      <Card>
        <div className="flex items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/munchies/employees/new')}>+ Add employee</PrimaryBtn>
          {selected.length > 0 && (
            <button onClick={() => { deleteEmployees(selected); setSelected([]); }} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
              <Trash2 className="w-4 h-4" /> Delete ({selected.length})
            </button>
          )}
          <div className="flex-1" />
          <div className="relative">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-mun-500/30 focus:border-mun-400 w-44" />
          </div>
        </div>

        <table className="w-full text-sm border-t border-slate-100">
          <thead>
            <tr className="text-ink-500">
              <th className="px-5 py-3 w-10"><CheckBox checked={allChecked} onChange={toggleAll} /></th>
              <th className="text-left font-medium px-2 py-3">Name</th>
              <th className="text-left font-medium px-5 py-3">Email</th>
              <th className="text-left font-medium px-5 py-3">Phone</th>
              <th className="text-left font-medium px-5 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((e) => (
              <tr key={e.id} onClick={() => navigate(`/munchies/employees/${e.id}`)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                <td className="px-5 py-4" onClick={(ev) => ev.stopPropagation()}><CheckBox checked={selected.includes(e.id)} onChange={() => toggleOne(e.id)} /></td>
                <td className="px-2 py-4 text-ink-700">{e.name}</td>
                <td className="px-5 py-4 text-ink-600 truncate max-w-[220px]">{e.email || '—'}</td>
                <td className="px-5 py-4 text-ink-400">{e.phone || '—'}</td>
                <td className="px-5 py-4 text-ink-700">{roleName(e.roleId)}</td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">No employees found.</td></tr>
            )}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <TablePagination page={page} pageCount={pageCount} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} />
        )}
      </Card>
    </div>
  );
}
