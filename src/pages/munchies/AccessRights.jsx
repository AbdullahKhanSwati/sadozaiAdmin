import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Trash2 } from 'lucide-react';
import { Card, PrimaryBtn, CheckBox } from './catalogUi.jsx';
import { usePagination, TablePagination } from './munchiesUi.jsx';
import EmployeeBanner from './EmployeeBanner.jsx';
import { useMunchies } from '../../store/MunchiesStore.jsx';
import { ROLE_ACCESS } from '../../data/munchiesCatalog.js';

export default function AccessRights() {
  const navigate = useNavigate();
  const { roles, employeeCount, deleteRoles } = useMunchies();
  const [selected, setSelected] = useState([]);

  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(roles, 10);

  // System roles (Owner) can't be selected for deletion.
  const selectable = pageItems.filter((r) => !r.system);
  const allChecked = selectable.length > 0 && selectable.every((r) => selected.includes(r.id));
  const toggleAll = () => setSelected(allChecked ? [] : selectable.map((r) => r.id));
  const toggleOne = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="max-w-[1200px] mx-auto">
      <EmployeeBanner />

      <Card>
        <div className="flex items-center gap-4 p-5">
          <PrimaryBtn onClick={() => navigate('/munchies/employees/access/new')}>+ Add role</PrimaryBtn>
          {selected.length > 0 && (
            <button onClick={() => { deleteRoles(selected); setSelected([]); }} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600">
              <Trash2 className="w-4 h-4" /> Delete ({selected.length})
            </button>
          )}
        </div>

        <table className="w-full text-sm border-t border-slate-100">
          <thead>
            <tr className="text-ink-500">
              <th className="px-5 py-3 w-10"><CheckBox checked={allChecked} onChange={toggleAll} /></th>
              <th className="text-left font-medium px-2 py-3">Role</th>
              <th className="text-left font-medium px-5 py-3">Access</th>
              <th className="text-right font-medium px-5 py-3">Employees</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((r) => (
              <tr key={r.id} onClick={() => navigate(`/munchies/employees/access/${r.id}`)} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                  {!r.system && <CheckBox checked={selected.includes(r.id)} onChange={() => toggleOne(r.id)} />}
                </td>
                <td className="px-2 py-4">
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-full text-white flex items-center justify-center shrink-0" style={{ backgroundColor: r.color }}>
                      <Users className="w-5 h-5" />
                    </span>
                    <span className="text-ink-800">{r.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-ink-600">{ROLE_ACCESS[r.access]}</td>
                <td className="px-5 py-4 text-right text-ink-700">{employeeCount(r.id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePagination page={page} pageCount={pageCount} rowsPerPage={rowsPerPage} setPage={setPage} setRowsPerPage={setRowsPerPage} />
      </Card>
    </div>
  );
}
