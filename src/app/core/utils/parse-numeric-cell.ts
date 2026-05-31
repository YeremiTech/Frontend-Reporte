/** Convierte celdas de Excel (moneda, comas, espacios) a número para gráficos. */
export function parseNumericCell(raw: string | undefined | null): number | null {
  if (raw == null) {
    return null;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  let normalized = trimmed.replace(/\s/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/,/g, '');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }
  normalized = normalized.replace(/[^\d.\-]/g, '');
  if (!normalized || normalized === '-' || normalized === '.') {
    return null;
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
