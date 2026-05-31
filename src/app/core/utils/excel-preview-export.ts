const SHEET_NAME = 'RGFM';

export async function exportPreviewRowsToExcel(
  columns: string[],
  rows: Record<string, string>[],
  filename: string
): Promise<void> {
  const XLSX = await import('xlsx');
  const { computeExcelColumnWidths } = await import('./excel-column-width');
  const sheetRows = rows.map((row) => {
    const line: Record<string, string> = {};
    for (const column of columns) {
      line[column] = row[column] ?? '';
    }
    return line;
  });

  const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: columns });
  worksheet['!cols'] = computeExcelColumnWidths(columns, sheetRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
  XLSX.writeFile(workbook, filename);
}
