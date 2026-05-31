import { parseNumericCell } from './parse-numeric-cell';

const TRUTHY_MARKERS = new Set(['SI', 'SÍ', 'S', 'YES', 'Y', 'X', 'TRUE', 'VERDADERO', '1']);

/** Celda con monto > 0 o marcador tipo SI / X (columnas "Categoría" con flags). */
export function cellHasImportValue(raw: string | undefined | null): boolean {
  if (raw == null) {
    return false;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return false;
  }
  const upper = trimmed.toUpperCase();
  if (TRUTHY_MARKERS.has(upper)) {
    return true;
  }
  const num = parseNumericCell(trimmed);
  return num !== null && num !== 0;
}

/** Texto a mostrar en tabla: número limpio o texto original (SI, etc.). */
export function formatImportCellDisplay(raw: string | undefined | null): string {
  if (raw == null) {
    return '';
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return '';
  }
  const num = parseNumericCell(trimmed);
  if (num !== null) {
    return String(num);
  }
  return trimmed;
}
