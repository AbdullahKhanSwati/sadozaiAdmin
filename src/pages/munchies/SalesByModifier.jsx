import { FileCheck2 } from 'lucide-react';
import { ReportToolbar, Panel, ExportBar, usePagination, TablePagination } from './munchiesUi.jsx';
import { modifierRows, rs } from '../../data/munchiesData.js';

export default function SalesByModifier() {
  // Paginate by modifier group (each group + its options is one unit).
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(modifierRows, 5);

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar />

      <Panel>
        <ExportBar />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Modifier</th>
                <th className="text-right font-medium px-5 py-3">Quantity sold</th>
                <th className="text-right font-medium px-5 py-3">Gross sales</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((g) => (
                <GroupBlock key={g.name} group={g} />
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          pageCount={pageCount}
          rowsPerPage={rowsPerPage}
          setPage={setPage}
          setRowsPerPage={setRowsPerPage}
        />
      </Panel>
    </div>
  );
}

function GroupBlock({ group }) {
  return (
    <>
      {/* Group header row */}
      <tr className="border-t border-slate-100 bg-slate-50/40">
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-mun-500 text-white flex items-center justify-center shrink-0">
              <FileCheck2 className="w-4 h-4" />
            </span>
            <span className="font-bold text-ink-800">{group.name}</span>
          </div>
        </td>
        <td className="px-5 py-4 text-right font-bold text-ink-800">{group.qty}</td>
        <td className="px-5 py-4 text-right font-bold text-ink-800">{rs(group.gross)}</td>
      </tr>
      {/* Option rows */}
      {group.options.map((o) => (
        <tr key={o.name} className="border-t border-slate-100 hover:bg-slate-50/60">
          <td className="px-5 py-3.5 pl-16 text-ink-600">{o.name}</td>
          <td className="px-5 py-3.5 text-right text-ink-600">{o.qty}</td>
          <td className="px-5 py-3.5 text-right text-ink-600">{rs(o.gross)}</td>
        </tr>
      ))}
    </>
  );
}
