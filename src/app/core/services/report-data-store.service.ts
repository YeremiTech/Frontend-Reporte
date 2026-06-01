import { Injectable, computed, signal } from '@angular/core';

import type { ReportDatasetSnapshot } from '../models/chart.model';

const STORAGE_KEY = 'comisiones_report_session';

interface PersistedReportState {
  rows: Record<string, string>[];
  columns: string[];
  sourceFileName: string;
  columnOrder: string[];
  hiddenColumns: string[];
}

export interface ReportImportPayload {
  rows: Record<string, string>[];
  columns: string[];
  sourceFileName?: string;
  columnOrder?: string[];
  hiddenColumns?: string[];
}

@Injectable({ providedIn: 'root' })
export class ReportDataStoreService {
  private readonly rowsSignal = signal<Record<string, string>[]>([]);
  private readonly columnsSignal = signal<string[]>([]);
  private readonly sourceFileNameSignal = signal('');
  private readonly columnOrderSignal = signal<string[]>([]);
  private readonly hiddenColumnsSignal = signal<string[]>([]);

  readonly hasData = computed(() => this.rowsSignal().length > 0);
  readonly sourceFileName = this.sourceFileNameSignal.asReadonly();

  readonly snapshot = computed((): ReportDatasetSnapshot | null => {
    if (!this.hasData()) {
      return null;
    }
    return {
      rows: this.rowsSignal(),
      columns: this.columnsSignal(),
    };
  });

  constructor() {
    this.restoreFromSession();
  }

  clear(): void {
    this.rowsSignal.set([]);
    this.columnsSignal.set([]);
    this.sourceFileNameSignal.set('');
    this.columnOrderSignal.set([]);
    this.hiddenColumnsSignal.set([]);
    this.removeSession();
  }

  /** Reemplaza el dataset completo (nueva importación). */
  loadFromImport(payload: ReportImportPayload): void {
    const columnOrder = payload.columnOrder?.length ? payload.columnOrder : payload.columns;
    const hiddenColumns = payload.hiddenColumns ?? [];

    this.rowsSignal.set([...payload.rows]);
    this.columnsSignal.set([...payload.columns]);
    this.sourceFileNameSignal.set(payload.sourceFileName ?? '');
    this.columnOrderSignal.set([...columnOrder]);
    this.hiddenColumnsSignal.set([...hiddenColumns]);
    this.persistToSession();
  }

  getColumnLayout(): { order: string[]; hiddenColumns: string[] } {
    return {
      order: this.columnOrderSignal(),
      hiddenColumns: this.hiddenColumnsSignal(),
    };
  }

  setColumnLayout(order: string[], hiddenColumns: Iterable<string>): void {
    this.columnOrderSignal.set([...order]);
    this.hiddenColumnsSignal.set([...hiddenColumns]);
    if (this.hasData()) {
      this.persistToSession();
    }
  }

  private persistToSession(): void {
    if (typeof sessionStorage === 'undefined' || !this.hasData()) {
      return;
    }

    const state: PersistedReportState = {
      rows: this.rowsSignal(),
      columns: this.columnsSignal(),
      sourceFileName: this.sourceFileNameSignal(),
      columnOrder: this.columnOrderSignal(),
      hiddenColumns: this.hiddenColumnsSignal(),
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Dataset demasiado grande para sessionStorage; se mantiene en memoria. */
    }
  }

  private restoreFromSession(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const state = JSON.parse(raw) as PersistedReportState;
      if (!Array.isArray(state.rows) || state.rows.length === 0) {
        return;
      }

      this.rowsSignal.set(state.rows);
      this.columnsSignal.set(state.columns ?? []);
      this.sourceFileNameSignal.set(state.sourceFileName ?? '');
      this.columnOrderSignal.set(
        state.columnOrder?.length ? state.columnOrder : (state.columns ?? [])
      );
      this.hiddenColumnsSignal.set(state.hiddenColumns ?? []);
    } catch {
      this.removeSession();
    }
  }

  private removeSession(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
