import { ReportToolbar, Panel, ExportBar, usePagination, TablePagination } from './munchiesUi.jsx';
import { rs } from '../../data/munchiesData.js';
import { useMunchies } from '../../store/MunchiesStore.jsx';

export default function SalesByCategory() {
  const { reports } = useMunchies();
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(reports.categoryRows, 10);

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar />

      <Panel>
        <ExportBar />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Category</th>
                <th className="text-right font-medium px-5 py-3">Items sold</th>
                <th className="text-right font-medium px-5 py-3">Net sales</th>
                <th className="text-right font-medium px-5 py-3">Cost of goods</th>
                <th className="text-right font-medium px-5 py-3">Gross profit</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-4 text-ink-700">{r.name}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{r.sold}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(r.net)}</td>
                  <td className="px-5 py-4 text-right text-ink-500">{rs(r.cost)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-ink-800">{rs(r.grossProfit)}</td>
                </tr>
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
