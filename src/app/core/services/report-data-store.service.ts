import { Injectable, computed, signal } from '@angular/core';

import type { ReportDatasetSnapshot } from '../models/chart.model';

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

  /** Incremented on each loadPersisted/clear so views can react to remote dataset updates. */
  readonly persistedVersion = signal(0);

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

  clear(): void {
    this.persistedRows.set([]);
    this.persistedColumns.set([]);
    this.persistedSourceFileName.set('');
    this.persistedColumnOrder.set([]);
    this.persistedHiddenColumns.set([]);
    this.clearPreview();
    this.persistedVersion.update((v) => v + 1);
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
    this.persistedVersion.update((v) => v + 1);
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
  }

  private clearPreview(): void {
    this.previewRows.set([]);
    this.previewColumns.set([]);
    this.previewSourceFileName.set('');
    this.previewHeadersFound.set([]);
    this.previewColumnOrder.set([]);
    this.previewHiddenColumns.set([]);
  }
}
