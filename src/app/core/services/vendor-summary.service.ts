import { Injectable } from '@angular/core';
import type {
  VendorReportColumnMapping,
  VendorViewResult,
  VendorViewRow,
} from '../models/vendor-summary.model';
import { normalizeRucCell } from '../utils/normalize-ruc-cell';
import { cellHasImportValue, formatImportCellDisplay } from '../utils/cell-has-import-value';
import { parseNumericCell } from '../utils/parse-numeric-cell';
import { getImportCell, resolveImportColumn } from '../utils/resolve-import-column';

const COLUMN_ALIASES = {
  vendedor: ['c_vendedor'],
  mes: ['MES'],
  ventaRec: ['VENTA NUEVA RECURRENTE'],
  ventaOt: ['VENTA NUEVA OT'],
  revenue: ['REVENUE'],
  ruc: ['c_ruc'],
  producto: ['c_nom_ser'],
  cliente: ['c_nom_cli', 'c_cod_enti', 'LLAVE'],
} as const;

interface VendorTotals {
  revRec: number;
  revOt: number;
  clientesRec: number;
  clientesOt: number;
}

@Injectable({ providedIn: 'root' })
export class VendorSummaryService {
  /**
   * Vista por vendedor (layout Excel). Solo filas que cumplen todas las columnas
   * obligatorias del detalle en la misma línea del import.
   */
  buildVendorView(rows: Record<string, string>[], columns: string[]): VendorViewResult {
    const mapping = this.resolveMapping(columns);
    const missingFields = this.collectMissing(mapping);

    if (!mapping.vendedor) {
      return {
        rows: [],
        mapping,
        missingFields,
        vendorCount: 0,
        rowsImported: rows.length,
        rowsMatchingFilter: 0,
      };
    }

    const qualifyingRows = rows.filter((row) => this.rowMeetsAllDetailColumns(row, mapping));
    const vendors = this.distinctVendors(qualifyingRows, mapping);
    const viewRows: VendorViewRow[] = [];

    for (const vendedor of vendors) {
      const vendorRows = qualifyingRows.filter(
        (r) => (getImportCell(r, mapping.vendedor) || '(Sin vendedor)') === vendedor
      );
      const totals = this.computeVendorTotals(vendorRows, mapping);
      const summaryRows = this.buildSummaryRows(vendedor, totals);
      const rowSpan = 1 + vendorRows.length + summaryRows.length;

      viewRows.push({
        rowType: 'vendor-header',
        vendedor,
        vendedorRowSpan: rowSpan,
        colRuc: 'RUC',
        colClientesOt: 'N° clientes OT',
        colRevOt: 'Rev. OT',
        colProducto: 'Producto',
      });

      for (const row of vendorRows) {
        viewRows.push({
          rowType: 'detail',
          vendedor,
          vendedorRowSpan: 0,
          colRuc: normalizeRucCell(getImportCell(row, mapping.ruc)),
          colClientesOt: this.detailClientesOt(row, mapping),
          colRevOt: this.detailRevOt(row, mapping),
          colProducto: getImportCell(row, mapping.producto),
        });
      }

      viewRows.push(...summaryRows);
    }

    return {
      rows: viewRows,
      mapping,
      missingFields,
      vendorCount: vendors.length,
      rowsImported: rows.length,
      rowsMatchingFilter: qualifyingRows.length,
    };
  }

  resolveMapping(columns: string[]): VendorReportColumnMapping {
    return {
      vendedor: resolveImportColumn(columns, COLUMN_ALIASES.vendedor),
      mes: resolveImportColumn(columns, COLUMN_ALIASES.mes),
      ventaRec: resolveImportColumn(columns, COLUMN_ALIASES.ventaRec),
      ventaOt: resolveImportColumn(columns, COLUMN_ALIASES.ventaOt),
      revenue: resolveImportColumn(columns, COLUMN_ALIASES.revenue),
      ruc: resolveImportColumn(columns, COLUMN_ALIASES.ruc),
      producto: resolveImportColumn(columns, COLUMN_ALIASES.producto),
      cliente: resolveImportColumn(columns, COLUMN_ALIASES.cliente),
    };
  }

  private collectMissing(mapping: VendorReportColumnMapping): string[] {
    const missing: string[] = [];
    if (!mapping.vendedor) {
      missing.push('vendedor');
    }
    if (!mapping.ventaRec && !mapping.revenue) {
      missing.push('revRec');
    }
    if (!mapping.ventaOt) {
      missing.push('revOt');
    }
    if (!mapping.ruc) {
      missing.push('ruc');
    }
    if (!mapping.producto) {
      missing.push('producto');
    }
    return missing;
  }

  private distinctVendors(
    rows: Record<string, string>[],
    mapping: VendorReportColumnMapping
  ): string[] {
    const set = new Set<string>();
    for (const row of rows) {
      set.add(getImportCell(row, mapping.vendedor) || '(Sin vendedor)');
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }

  private computeVendorTotals(
    vendorRows: Record<string, string>[],
    mapping: VendorReportColumnMapping
  ): VendorTotals {
    const recClients = new Set<string>();
    const otClients = new Set<string>();
    let revRec = 0;
    let revOt = 0;

    for (const row of vendorRows) {
      const ventaRec = this.amount(row, mapping.ventaRec);
      revRec += ventaRec > 0 ? ventaRec : this.amount(row, mapping.revenue);
      revOt += this.amount(row, mapping.ventaOt);

      if (this.rowHasRecSale(row, mapping)) {
        const id = this.clientId(row, mapping);
        if (id) {
          recClients.add(id);
        }
      }
      if (this.rowHasOtSale(row, mapping)) {
        const id = this.clientId(row, mapping);
        if (id) {
          otClients.add(id);
        }
      }
    }

    return {
      revRec,
      revOt,
      clientesRec: recClients.size,
      clientesOt: otClients.size,
    };
  }

  /**
   * Fila detalle: vendedor, RUC, producto, Rev Rec y Rev. OT con valor en la misma fila.
   */
  private rowMeetsAllDetailColumns(
    row: Record<string, string>,
    mapping: VendorReportColumnMapping
  ): boolean {
    const vendedor = getImportCell(row, mapping.vendedor);
    const ruc = normalizeRucCell(getImportCell(row, mapping.ruc));
    const producto = getImportCell(row, mapping.producto);
    if (!vendedor || !ruc || !producto) {
      return false;
    }
    if (!this.rowHasRecSale(row, mapping)) {
      return false;
    }
    if (!this.rowHasOtSale(row, mapping)) {
      return false;
    }
    return true;
  }

  private buildSummaryRows(vendedor: string, totals: VendorTotals): VendorViewRow[] {
    const rows: VendorViewRow[] = [];
    if (totals.revRec > 0) {
      rows.push({
        rowType: 'summary-rec',
        vendedor,
        vendedorRowSpan: 0,
        colRuc: 'Rev Rec',
        colClientesOt: '',
        colRevOt: this.summaryAmount(totals.revRec),
        colProducto: '',
      });
    }
    if (totals.clientesRec > 0) {
      rows.push({
        rowType: 'summary-clientes-rec',
        vendedor,
        vendedorRowSpan: 0,
        colRuc: 'N° clientes Rec',
        colClientesOt: this.summaryCount(totals.clientesRec),
        colRevOt: '',
        colProducto: '',
      });
    }
    return rows;
  }

  private summaryAmount(value: number): string {
    return value > 0 ? this.formatNumber(value) : '';
  }

  private summaryCount(value: number): string {
    return value > 0 ? String(value) : '';
  }

  private detailRevOt(row: Record<string, string>, mapping: VendorReportColumnMapping): string {
    if (!this.rowHasOtSale(row, mapping)) {
      return '';
    }
    return formatImportCellDisplay(getImportCell(row, mapping.ventaOt));
  }

  /** En detalle: 1 si la fila tiene venta OT (conteo por fila). */
  private detailClientesOt(row: Record<string, string>, mapping: VendorReportColumnMapping): string {
    return this.rowHasOtSale(row, mapping) ? '1' : '';
  }

  private clientId(row: Record<string, string>, mapping: VendorReportColumnMapping): string {
    const ruc = normalizeRucCell(getImportCell(row, mapping.ruc));
    if (ruc) {
      return `ruc:${ruc}`;
    }
    const cliente = getImportCell(row, mapping.cliente);
    if (cliente) {
      return `cli:${cliente}`;
    }
    return '';
  }

  private rowHasRecSale(row: Record<string, string>, mapping: VendorReportColumnMapping): boolean {
    return (
      cellHasImportValue(getImportCell(row, mapping.ventaRec)) ||
      cellHasImportValue(getImportCell(row, mapping.revenue))
    );
  }

  private rowHasOtSale(row: Record<string, string>, mapping: VendorReportColumnMapping): boolean {
    return cellHasImportValue(getImportCell(row, mapping.ventaOt));
  }

  private amount(row: Record<string, string>, column: string | null): number {
    if (!column) {
      return 0;
    }
    return parseNumericCell(getImportCell(row, column)) ?? 0;
  }

  private formatNumber(value: number): string {
    if (value === 0) {
      return '';
    }
    return value.toLocaleString('es-PE', { maximumFractionDigits: 2 });
  }
}
