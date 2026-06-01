export interface ImportResult {
  sheetName: string;
  headersFound: string[];
  rowsImported: number;
  message: string;
  rows: Record<string, string>[];
}

export function uniqueImportHeaders(headers: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const header of headers) {
    const trimmed = header?.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      ordered.push(trimmed);
    }
  }

  return ordered;
}
