import { normalizeImportHeader } from './normalize-import-header';

/** Busca la columna real del Excel según alias conocidos (cabeceras dinámicas). */
export function resolveImportColumn(
  availableColumns: string[],
  aliases: readonly string[]
): string | null {
  const byNorm = new Map<string, string>();
  for (const col of availableColumns) {
    byNorm.set(normalizeImportHeader(col), col);
  }
  for (const alias of aliases) {
    const hit = byNorm.get(normalizeImportHeader(alias));
    if (hit) {
      return hit;
    }
  }
  return null;
}

/** Busca columna cuya cabecera normalizada contiene todas las palabras clave. */
export function resolveImportColumnByKeywords(
  availableColumns: string[],
  mustInclude: readonly string[],
  mustExclude: readonly string[] = []
): string | null {
  for (const col of availableColumns) {
    const norm = normalizeImportHeader(col);
    const okInclude = mustInclude.every((key) => norm.includes(key));
    const okExclude = !mustExclude.some((key) => norm.includes(key));
    if (okInclude && okExclude) {
      return col;
    }
  }
  return null;
}

export function getImportCell(row: Record<string, string>, columnKey: string | null): string {
  if (!columnKey) {
    return '';
  }
  const value = row[columnKey];
  return value == null ? '' : String(value).trim();
}
