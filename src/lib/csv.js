// Tiny CSV exporter — builds a spreadsheet-safe CSV and triggers a download.
//   columns: [{ label, value }]  where value is a field key or (row) => any
function escapeCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Trigger a browser download for a finished CSV string.
function triggerDownload(filename, csv) {
  // ﻿ BOM so Excel reads UTF-8 (₨, accents) correctly.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename, columns, rows) {
  const header = columns.map((c) => escapeCell(c.label)).join(',');
  const lines = (rows || []).map((r) =>
    columns
      .map((c) => escapeCell(typeof c.value === 'function' ? c.value(r) : r[c.value]))
      .join(',')
  );
  triggerDownload(filename, [header, ...lines].join('\r\n'));
}

// Build a CSV from a 2D array of rows (each row = array of cells). Lets us
// produce multi-section "report" exports (titles, blank spacer rows,
// sub-tables) that a single flat table can't express. Numbers are written
// raw (no "Rs." prefix) so spreadsheet formulas still work; put units in the
// header label instead.
export function downloadCsvMatrix(filename, matrix) {
  const lines = (matrix || []).map((row) => (row || []).map(escapeCell).join(','));
  triggerDownload(filename, lines.join('\r\n'));
}

export function csvDate() {
  return new Date().toISOString().slice(0, 10);
}

// Parse CSV text → array of objects keyed by the header row. Handles quoted
// cells, escaped quotes ("") and commas/newlines inside quotes.
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const s = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}
