import { ReportToolbar, Panel, ExportBar, usePagination, TablePagination } from './bfUi.jsx';
import { rs } from '../../data/munchiesData.js';
import { useBlockFactory } from '../../store/BlockFactoryStore.jsx';
import { downloadCsv, csvDate } from '../../lib/csv.js';

export default function Discounts() {
  const { reports } = useBlockFactory();
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(reports.discountReportRows, 10);

  const onExport = () => downloadCsv(`block-factory-discounts-${csvDate()}.csv`, [
    { label: 'Name', value: 'name' },
    { label: 'Discounts applied', value: (r) => r.applied || 0 },
    { label: 'Amount discounted', value: (r) => r.amount || 0 },
  ], reports.discountReportRows);

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar />

      <Panel>
        <ExportBar onExport={onExport} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-500">
                <th className="text-left font-medium px-5 py-3">Name</th>
                <th className="text-right font-medium px-5 py-3">Discounts applied</th>
                <th className="text-right font-medium px-5 py-3">Amount discounted</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-4 text-ink-700">{r.name}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{r.applied}</td>
                  <td className="px-5 py-4 text-right font-semibold text-ink-800">{rs(r.amount)}</td>
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
