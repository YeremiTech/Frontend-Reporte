import { Injectable, computed, signal } from '@angular/core';

import type { ReportDatasetSnapshot } from '../models/chart.model';

const STORAGE_KEY = 'comisiones_report_persisted';

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
  private readonly persistedRows = signal<Record<string, string>[]>([]);
  private readonly persistedColumns = signal<string[]>([]);
  private readonly persistedSourceFileName = signal('');
  private readonly persistedColumnOrder = signal<string[]>([]);
  private readonly persistedHiddenColumns = signal<string[]>([]);

  private readonly previewRows = signal<Record<string, string>[]>([]);
  private readonly previewColumns = signal<string[]>([]);
  private readonly previewSourceFileName = signal('');
  private readonly previewHeadersFound = signal<string[]>([]);
  private readonly previewColumnOrder = signal<string[]>([]);
  private readonly previewHiddenColumns = signal<string[]>([]);

  readonly hasPendingSave = computed(() => this.previewRows().length > 0);
  readonly hasPersistedData = computed(() => this.persistedRows().length > 0);
  readonly hasReportsData = computed(() => this.hasPendingSave() || this.hasPersistedData());

  readonly sourceFileName = computed(() =>
    this.hasPendingSave() ? this.previewSourceFileName() : this.persistedSourceFileName()
  );

  /** Vista Reportes: vista previa si existe; si no, datos guardados en BD. */
  readonly reportsSnapshot = computed((): ReportDatasetSnapshot | null => {
    if (this.previewRows().length > 0) {
      return { rows: this.previewRows(), columns: this.previewColumns() };
    }
    if (this.persistedRows().length > 0) {
      return { rows: this.persistedRows(), columns: this.persistedColumns() };
    }
    return null;
  });

  /** Gráficos y Resumen: solo datos persistidos en BD. */
  readonly persistedSnapshot = computed((): ReportDatasetSnapshot | null => {
    if (this.persistedRows().length === 0) {
      return null;
    }
    return { rows: this.persistedRows(), columns: this.persistedColumns() };
  });

  constructor() {
    this.restorePersistedFromSession();
  }

  clear(): void {
    this.persistedRows.set([]);
    this.persistedColumns.set([]);
    this.persistedSourceFileName.set('');
    this.persistedColumnOrder.set([]);
    this.persistedHiddenColumns.set([]);
    this.clearPreview();
    this.removeSession();
  }

  /** Vista previa tras importar Excel (aún no guardada en BD). */
  loadPreview(payload: ReportImportPayload, headersFound: string[]): void {
    const columnOrder = payload.columnOrder?.length ? payload.columnOrder : payload.columns;
    const hiddenColumns = payload.hiddenColumns ?? [];

    this.previewRows.set([...payload.rows]);
    this.previewColumns.set([...payload.columns]);
    this.previewSourceFileName.set(payload.sourceFileName ?? '');
    this.previewHeadersFound.set([...headersFound]);
    this.previewColumnOrder.set([...columnOrder]);
    this.previewHiddenColumns.set([...hiddenColumns]);
  }

  /** Datos cargados desde la BD (GET /dataset o tras guardar importación). */
  loadPersisted(payload: ReportImportPayload): void {
    const columnOrder = payload.columnOrder?.length ? payload.columnOrder : payload.columns;
    const hiddenColumns = payload.hiddenColumns ?? [];

    this.persistedRows.set([...payload.rows]);
    this.persistedColumns.set([...payload.columns]);
    this.persistedSourceFileName.set(payload.sourceFileName ?? '');
    this.persistedColumnOrder.set([...columnOrder]);
    this.persistedHiddenColumns.set([...hiddenColumns]);
    this.clearPreview();
    this.persistToSession();
  }

  getPreviewForSave(): {
    rows: Record<string, string>[];
    sourceFileName: string;
    headersFound: string[];
  } | null {
    if (!this.hasPendingSave()) {
      return null;
    }
    return {
      rows: this.previewRows(),
      sourceFileName: this.previewSourceFileName(),
      headersFound: this.previewHeadersFound(),
    };
  }

  getColumnLayout(): { order: string[]; hiddenColumns: string[] } {
    if (this.hasPendingSave()) {
      return {
        order: this.previewColumnOrder(),
        hiddenColumns: this.previewHiddenColumns(),
      };
    }
    return {
      order: this.persistedColumnOrder(),
      hiddenColumns: this.persistedHiddenColumns(),
    };
  }

  setColumnLayout(order: string[], hiddenColumns: Iterable<string>): void {
    const hidden = [...hiddenColumns];
    if (this.hasPendingSave()) {
      this.previewColumnOrder.set([...order]);
      this.previewHiddenColumns.set(hidden);
      return;
    }
    this.persistedColumnOrder.set([...order]);
    this.persistedHiddenColumns.set(hidden);
    if (this.hasPersistedData()) {
      this.persistToSession();
    }
  }

  private clearPreview(): void {
    this.previewRows.set([]);
    this.previewColumns.set([]);
    this.previewSourceFileName.set('');
    this.previewHeadersFound.set([]);
    this.previewColumnOrder.set([]);
    this.previewHiddenColumns.set([]);
  }

  private persistToSession(): void {
    if (typeof sessionStorage === 'undefined' || !this.hasPersistedData()) {
      return;
    }

    const state: PersistedReportState = {
      rows: this.persistedRows(),
      columns: this.persistedColumns(),
      sourceFileName: this.persistedSourceFileName(),
      columnOrder: this.persistedColumnOrder(),
      hiddenColumns: this.persistedHiddenColumns(),
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Dataset demasiado grande para sessionStorage; se mantiene en memoria. */
    }
  }

  private restorePersistedFromSession(): void {
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

      this.persistedRows.set(state.rows);
      this.persistedColumns.set(state.columns ?? []);
      this.persistedSourceFileName.set(state.sourceFileName ?? '');
      this.persistedColumnOrder.set(
        state.columnOrder?.length ? state.columnOrder : (state.columns ?? [])
      );
      this.persistedHiddenColumns.set(state.hiddenColumns ?? []);
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
