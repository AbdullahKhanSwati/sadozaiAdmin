import { useState } from 'react';
import { ReportToolbar, Panel, ExportBar, usePagination, TablePagination, defaultRange, rangeLabel } from './munchiesUi.jsx';
import { rs } from '../../data/munchiesData.js';
import { useReports } from '../../store/MunchiesStore.jsx';
import { downloadCsv, csvDate } from '../../lib/csv.js';

export default function SalesByEmployee() {
  const [range, setRange] = useState(defaultRange);
  const reports = useReports(range);
  const onExport = () => downloadCsv(`munchies-sales-by-employee-${csvDate()}.csv`, [
    { label: 'Name', value: 'name' },
    { label: 'Gross sales', value: (r) => r.gross || 0 },
    { label: 'Refunds', value: (r) => r.refunds || 0 },
    { label: 'Discounts', value: (r) => r.discounts || 0 },
    { label: 'Net sales', value: (r) => r.net || 0 },
    { label: 'Receipts', value: (r) => r.receipts || 0 },
    { label: 'Average sale', value: (r) => Math.round((r.avgSale || 0) * 100) / 100 },
  ], reports.employeeRows);
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(reports.employeeRows, 10);

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
                <th className="text-right font-medium px-5 py-3">Gross sales</th>
                <th className="text-right font-medium px-5 py-3">Refunds</th>
                <th className="text-right font-medium px-5 py-3">Discounts</th>
                <th className="text-right font-medium px-5 py-3">Net sales</th>
                <th className="text-right font-medium px-5 py-3">Receipts</th>
                <th className="text-right font-medium px-5 py-3">Average sale</th>
                <th className="text-right font-medium px-5 py-3">Customers signed up</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((r) => (
                <tr key={r.name} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-5 py-4 text-ink-700 font-medium">{r.name}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(r.gross)}</td>
                  <td className="px-5 py-4 text-right text-ink-500">{rs(r.refunds)}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(r.discounts)}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(r.net)}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{r.receipts}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{rs(r.avgSale)}</td>
                  <td className="px-5 py-4 text-right text-ink-700">{r.signups}</td>
                </tr>
              ))}
              {reports.employeeRows.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-400">No sales in this period.</td></tr>
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
