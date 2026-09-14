import { useState } from 'react';
import { ReportToolbar, Panel, ExportBar, usePagination, TablePagination, defaultRange, rangeLabel } from './munchiesUi.jsx';
import { rs } from '../../data/munchiesData.js';
import { useReports } from '../../store/MunchiesStore.jsx';
import { downloadCsv, csvDate } from '../../lib/csv.js';

export default function Discounts() {
  // Month to date by default; changeable from the toolbar like the summary page.
  const [range, setRange] = useState(defaultRange);
  const reports = useReports(range);
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(reports.discountReportRows, 10);
  const totalApplied = reports.discountReportRows.reduce((s, r) => s + (r.applied || 0), 0);
  const totalAmount = reports.discountReportRows.reduce((s, r) => s + (r.amount || 0), 0);

  const onExport = () => downloadCsv(`munchies-discounts-${csvDate()}.csv`, [
    { label: 'Name', value: 'name' },
    { label: 'Discounts applied', value: (r) => r.applied || 0 },
    { label: 'Amount discounted', value: (r) => r.amount || 0 },
  ], reports.discountReportRows);

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar range={range} onRange={setRange} />

      <Panel>
        <ExportBar onExport={onExport}>
          <span className="hidden sm:inline text-xs font-semibold text-ink-400 whitespace-nowrap">{rangeLabel(range)}</span>
        </ExportBar>
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
              {reports.discountReportRows.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-10 text-center text-ink-400">No discounts applied in this period.</td></tr>
              )}
              {reports.discountReportRows.length > 0 && (
                <tr className="border-t border-slate-200 bg-slate-50/60 font-bold text-ink-800">
                  <td className="px-5 py-3.5">Total</td>
                  <td className="px-5 py-3.5 text-right">{totalApplied}</td>
                  <td className="px-5 py-3.5 text-right">{rs(totalAmount)}</td>
                </tr>
              )}
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
