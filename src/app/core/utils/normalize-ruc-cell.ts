/** Conserva el RUC completo tal como viene del Excel (evita notación científica o decimales). */
export function normalizeRucCell(raw: string | null | undefined): string {
  if (raw == null) {
    return '';
  }
  let value = String(raw).trim();
  if (!value) {
    return '';
  }

  if (/^[\d.,]+[eE][+\-]?\d+$/.test(value)) {
    const num = Number(value.replace(',', '.'));
    if (Number.isFinite(num)) {
      value = String(Math.round(num));
    }
  }

  if (/^\d+\.0+$/.test(value)) {
    value = value.split('.')[0] ?? value;
  }

  if (/^\d+,\d+$/.test(value)) {
    value = value.replace(',', '');
  }

  return value;
}
