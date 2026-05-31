const MIN_COLUMN_WIDTH_CHARS = 10;
const MAX_COLUMN_WIDTH_CHARS = 80;
const COLUMN_WIDTH_PADDING_CHARS = 2;

/** Ancho de columnas para SheetJS (`!cols`), según header y contenido de filas. */
export function computeExcelColumnWidths(
  columns: string[],
  rows: Record<string, string>[]
): { wch: number }[] {
  return columns.map((column) => {
    let maxLen = column.length;
    for (const row of rows) {
      const valueLen = String(row[column] ?? '').length;
      if (valueLen > maxLen) {
        maxLen = valueLen;
      }
    }
    const wch = maxLen + COLUMN_WIDTH_PADDING_CHARS;
    return {
      wch: Math.min(MAX_COLUMN_WIDTH_CHARS, Math.max(MIN_COLUMN_WIDTH_CHARS, wch)),
    };
  });
}
