import { ReportToolbar, Panel, ExportBar, usePagination, TablePagination } from './munchiesUi.jsx';
import { employeeRows, rs } from '../../data/munchiesData.js';

export default function SalesByEmployee() {
  const { page, setPage, rowsPerPage, setRowsPerPage, pageCount, pageItems } = usePagination(employeeRows, 10);

  return (
    <div className="max-w-[1400px] mx-auto">
      <ReportToolbar />

      <Panel>
        <ExportBar />
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
