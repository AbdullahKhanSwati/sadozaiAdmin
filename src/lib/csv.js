// Tiny CSV exporter — builds a spreadsheet-safe CSV and triggers a download.
//   columns: [{ label, value }]  where value is a field key or (row) => any
function escapeCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = (rows || []).map((r) =>
    columns
      .map((c) => escapeCell(typeof c.value === 'function' ? c.value(r) : r[c.value]))
      .join(',')
  );
  // ﻿ BOM so Excel reads UTF-8 (₨, accents) correctly.
  const csv = `﻿${[header, ...lines].join('\r\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function csvDate() {
  return new Date().toISOString().slice(0, 10);
}
