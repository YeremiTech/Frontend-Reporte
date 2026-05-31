import { normalizeImportHeader } from '../utils/normalize-import-header';

export interface RgfmRecord {
  id?: number;
  mes?: string;
  productoAgrupado?: string;
  productoDesagregado?: string;
  clasificacion?: string;
  mercadoLocal?: string;
  subMercado?: string;
  segmento?: string;
  cNomMer?: string;
  cVendedor?: string;
  cCodEnti?: string;
  llave?: string;
  cRuc?: string;
  cNomCli?: string;
  nNeto?: number;
  nNetosoles?: number;
  cNomOri?: string;
  cNomSubent?: string;
  cTipDoc?: string;
  cNumSunat?: string;
  dEmiDoc?: string;
  cTipMoneda?: string;
  nTipoCambio?: number;
  nIdDoc?: string;
  cMotivo?: string;
  cNomSer?: string;
  name1?: string;
  name2?: string;
  name4?: string;
  name5?: string;
  revenue?: number;
  ventaNuevaRec?: number;
  ventaNuevaOt?: number;
  importedAt?: string;
  extraData?: Record<string, string>;
}

export interface RgfmListResponse {
  total: number;
  page: number;
  size: number;
  totalPages: number;
  data: RgfmRecord[];
}

export interface RgfmFiltersResponse {
  meses: string[];
  vendedores: string[];
}

export interface RgfmQueryParams {
  page?: number;
  size?: number;
  mes?: string;
  vendedor?: string;
}

export interface RgfmHeadersResponse {
  expectedHeaders: string[];
  standardHeaders?: string[];
  totalColumns: number;
}

export interface ImportResult {
  sheetName: string;
  headersFound: string[];
  rowsImported: number;
  message: string;
  rows: Record<string, string>[];
}

export interface SaveImportRequest {
  sourceFileName?: string;
  headersFound?: string[];
  rows: Record<string, string>[];
}

export interface SaveImportResult {
  rowsSaved: number;
  message: string;
  sourceFileName?: string;
  headersPersisted?: string[];
  dynamicColumnsAdded?: number;
}

export type RgfmTableRow = RgfmRecord | Record<string, string>;

export const HEADER_FIELD_MAP: Record<string, keyof RgfmRecord> = {
  MES: 'mes',
  'Producto Agrupado': 'productoAgrupado',
  'Producto Desagregado': 'productoDesagregado',
  Clasificación: 'clasificacion',
  'Mercado Local': 'mercadoLocal',
  'Sub Mercado': 'subMercado',
  Segmento: 'segmento',
  c_nom_mer: 'cNomMer',
  c_vendedor: 'cVendedor',
  c_cod_enti: 'cCodEnti',
  LLAVE: 'llave',
  c_ruc: 'cRuc',
  c_nom_cli: 'cNomCli',
  n_neto: 'nNeto',
  n_netosoles: 'nNetosoles',
  c_nom_ori: 'cNomOri',
  c_nom_subent: 'cNomSubent',
  c_tip_doc: 'cTipDoc',
  c_num_sunat: 'cNumSunat',
  d_emi_doc: 'dEmiDoc',
  c_tip_moneda: 'cTipMoneda',
  n_tipo_cambio: 'nTipoCambio',
  n_id_doc: 'nIdDoc',
  c_motivo: 'cMotivo',
  c_nom_ser: 'cNomSer',
  name_1: 'name1',
  name_2: 'name2',
  name_4: 'name4',
  name_5: 'name5',
  REVENUE: 'revenue',
  'VENTA NUEVA RECURRENTE': 'ventaNuevaRec',
  'VENTA NUEVA OT': 'ventaNuevaOt',
};

function legacyJacksonKey(field: string): string | null {
  if (field.length >= 2 && /^[cdn][A-Z]/.test(field)) {
    return field.charAt(0) + field.charAt(1).toLowerCase() + field.slice(2);
  }
  return null;
}

export function mergeColumnOrder(headersFromExcel: string[], standardHeaders: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const header of headersFromExcel) {
    if (header && !seen.has(header)) {
      seen.add(header);
      ordered.push(header);
    }
  }
  for (const header of standardHeaders) {
    if (!seen.has(header)) {
      seen.add(header);
      ordered.push(header);
    }
  }
  return ordered;
}

export function cellValueByHeader(record: RgfmRecord, header: string): string {
  const field = HEADER_FIELD_MAP[header];
  if (field) {
    const rec = record as Record<string, unknown>;
    const legacy = legacyJacksonKey(field);
    const value = rec[field] ?? (legacy ? rec[legacy] : undefined);

    if (value !== null && value !== undefined) {
      return String(value);
    }
  }

  const extra = record.extraData;
  if (extra) {
    if (header in extra) {
      return extra[header] ?? '';
    }
    const normalizedHeader = normalizeImportHeader(header);
    for (const [key, value] of Object.entries(extra)) {
      if (normalizeImportHeader(key) === normalizedHeader) {
        return value ?? '';
      }
    }
  }

  return '';
}

export function cellValueForRow(row: RgfmTableRow, header: string): string {
  const direct = (row as Record<string, unknown>)[header];
  if (direct !== undefined && direct !== null) {
    return String(direct);
  }
  if ('id' in row || 'mes' in row) {
    return cellValueByHeader(row as RgfmRecord, header);
  }
  return '';
}

/** Convierte registros de BD al formato de filas usado por gráficos y resumen. */
export function rgfmRecordsToImportRows(
  records: RgfmRecord[],
  headers: string[]
): Record<string, string>[] {
  return records.map((record) => {
    const row: Record<string, string> = {};
    for (const header of headers) {
      row[header] = cellValueByHeader(record, header);
    }
    return row;
  });
}
