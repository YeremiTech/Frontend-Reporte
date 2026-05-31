export function normalizeImportHeader(header: string): string {
  return header.trim().replace(/\s+/g, ' ').toUpperCase();
}
