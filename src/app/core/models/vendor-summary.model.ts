export interface VendorReportColumnMapping {
  vendedor: string | null;
  mes: string | null;
  ventaRec: string | null;
  ventaOt: string | null;
  revenue: string | null;
  ruc: string | null;
  producto: string | null;
  cliente: string | null;
}

export type VendorViewRowType = 'vendor-header' | 'detail' | 'summary-rec' | 'summary-clientes-rec';

/** Una fila de la tabla agrupada por vendedor (layout Excel). */
export interface VendorViewRow {
  rowType: VendorViewRowType;
  vendedor: string;
  /** Solo en la primera fila del bloque del vendedor. */
  vendedorRowSpan: number;
  colRuc: string;
  colClientesOt: string;
  colRevOt: string;
  colProducto: string;
}

export interface VendorViewResult {
  rows: VendorViewRow[];
  mapping: VendorReportColumnMapping;
  missingFields: string[];
  vendorCount: number;
  rowsImported: number;
  rowsMatchingFilter: number;
}
