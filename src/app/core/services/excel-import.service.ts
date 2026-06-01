import { Injectable } from '@angular/core';

import { ApiErrorCode } from '../constants';
import { ImportResult } from '../models/rgfm.model';
import { resolvedError } from '../utils/api-error.resolver';
import { ResolvedApiError } from '../models/api-response.model';

const SHEET_NAME = 'RGFM';

type CellMatrix = (string | number | boolean | null)[][];

@Injectable({ providedIn: 'root' })
export class ExcelImportService {
  async parseFile(file: File): Promise<ImportResult> {
    const XLSX = await import('xlsx');

    let workbook: import('xlsx').WorkBook;
    try {
      const buffer = await file.arrayBuffer();
      workbook = XLSX.read(buffer, { type: 'array' });
    } catch {
      throw resolvedError(
        ApiErrorCode.EXCEL_IMPORT_ERROR,
        'No se pudo abrir el archivo. Compruebe que sea un Excel válido (.xlsx o .xls).'
      );
    }

    const sheet =
      workbook.Sheets[SHEET_NAME] ??
      (workbook.SheetNames.length > 0 ? workbook.Sheets[workbook.SheetNames[0]] : undefined);

    if (!sheet) {
      throw resolvedError(ApiErrorCode.EXCEL_IMPORT_ERROR, 'El archivo no contiene hojas.');
    }

    const matrix = this.readSheetMatrix(sheet, XLSX);
    if (matrix.length === 0) {
      throw resolvedError(
        ApiErrorCode.EXCEL_IMPORT_ERROR,
        'La hoja está vacía (sin fila de encabezados).'
      );
    }

    const headerRow = matrix[0] ?? [];
    const headerColumns: { index: number; header: string }[] = [];

    for (let index = 0; index < headerRow.length; index++) {
      const header = this.cellToString(headerRow[index]).trim();
      if (header) {
        headerColumns.push({ index, header });
      }
    }

    if (headerColumns.length === 0) {
      throw resolvedError(
        ApiErrorCode.EXCEL_IMPORT_ERROR,
        'La primera fila no tiene nombres de columna.'
      );
    }

    const headersFound = headerColumns.map((column) => column.header);
    this.validateNoDuplicateHeaders(headersFound);

    const rows: Record<string, string>[] = [];
    for (let rowIndex = 1; rowIndex < matrix.length; rowIndex++) {
      const rawRow = matrix[rowIndex] ?? [];
      if (this.isEmptyRow(rawRow, headerColumns)) {
        continue;
      }

      const record: Record<string, string> = {};
      for (const column of headerColumns) {
        record[column.header] = this.cellToString(rawRow[column.index]).trim();
      }
      rows.push(record);
    }

    if (rows.length === 0) {
      throw resolvedError(
        ApiErrorCode.EXCEL_IMPORT_ERROR,
        'El Excel no tiene filas con datos (solo cabeceras o celdas vacías).'
      );
    }

    const sheetLabel = workbook.SheetNames.includes(SHEET_NAME)
      ? SHEET_NAME
      : (workbook.SheetNames[0] ?? SHEET_NAME);

    return {
      sheetName: sheetLabel,
      headersFound,
      rowsImported: rows.length,
      message: `Vista previa desde ${file.name}`,
      rows,
    };
  }

  /** Lee todas las celdas del rango usado en la hoja (respeta columnas al final). */
  private readSheetMatrix(sheet: import('xlsx').WorkSheet, XLSX: typeof import('xlsx')): CellMatrix {
    const ref = sheet['!ref'];
    if (!ref) {
      return [];
    }

    const range = XLSX.utils.decode_range(ref);
    const matrix: CellMatrix = [];

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex++) {
      const row: (string | number | boolean | null)[] = [];
      for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex++) {
        const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        const cell = sheet[address];
        row.push(cell ? XLSX.utils.format_cell(cell) : '');
      }
      matrix.push(row);
    }

    return matrix;
  }

  private cellToString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  private isEmptyRow(
    row: (string | number | boolean | null)[],
    headerColumns: { index: number; header: string }[]
  ): boolean {
    for (const column of headerColumns) {
      const value = this.cellToString(row[column.index]).trim();
      if (value) {
        return false;
      }
    }
    return true;
  }

  private validateNoDuplicateHeaders(headers: string[]): void {
    const seen = new Set<string>();
    const duplicates: string[] = [];

    for (const header of headers) {
      if (seen.has(header)) {
        if (!duplicates.includes(header)) {
          duplicates.push(header);
        }
      } else {
        seen.add(header);
      }
    }

    if (duplicates.length > 0) {
      const detail = duplicates.join(', ');
      throw resolvedError(
        ApiErrorCode.EXCEL_IMPORT_ERROR,
        `Columnas duplicadas en la primera fila: ${detail}.`
      ) as ResolvedApiError;
    }
  }
}
