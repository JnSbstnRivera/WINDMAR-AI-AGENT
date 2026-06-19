/**
 * Descarga CSV compatible con Excel (cliente).
 * BOM UTF-8 (tildes correctas) + separador ';' (Excel en español separa columnas).
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null>>
): void {
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = [headers, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([String.fromCharCode(0xfeff) + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
