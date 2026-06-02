import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiErrorCode } from '../../../../core/constants';
import { RgfmApiService } from '../../../../core/services/api.service';
import { resolvedError } from '../../../../core/utils/api-error.resolver';
import { validateImportFile } from '../../../../core/utils/validate-import-file';
import { AppViewSettingsService } from '../../../../core/services/app-view-settings.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReportDataStoreService } from '../../../../core/services/report-data-store.service';
import { ReportDataSyncService } from '../../../../core/services/report-data-sync.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { TailgridsAlertComponent } from '../../../../shared/components/tailgrids-alert/tailgrids-alert.component';
import { RgfmColumnPanelComponent } from '../../components/rgfm-column-panel/rgfm-column-panel.component';
import {
  uniqueImportHeaders,
} from '../../../../core/models/rgfm.model';
import { ResolvedApiError } from '../../../../core/models/api-response.model';

export interface RenderedTableRow {
  id: string | number;
  index: number;
  cells: string[];
}

@Component({
  selector: 'app-rgfm-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    TailgridsAlertComponent,
    LoaderComponent,
    PageShellComponent,
    RgfmColumnPanelComponent,
  ],
  templateUrl: './rgfm-dashboard.component.html',
  styleUrl: './rgfm-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RgfmDashboardComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly rgfmApi = inject(RgfmApiService);
  private readonly reportDataStore = inject(ReportDataStoreService);
  private readonly reportDataSync = inject(ReportDataSyncService);
  private readonly auth = inject(AuthService);
  private readonly appViewSettings = inject(AppViewSettingsService);
  protected readonly toast = inject(ToastService);

  readonly canEdit = computed(() => this.auth.canEditReports());

  private lastAppliedViewRevision = -1;
  readonly pageSize = 50;

  columnOrder = signal<string[]>([]);
  hiddenColumns = signal<Set<string>>(new Set());
  private readonly baselineColumnOrder = signal<string[]>([]);
  private readonly baselineHiddenColumns = signal<Set<string>>(new Set());

  readonly displayColumns = computed(() =>
    this.columnOrder().filter((header) => !this.hiddenColumns().has(header))
  );

  readonly hasPendingSave = this.reportDataStore.hasPendingSave;

  readonly importedRows = computed(() => this.reportDataStore.reportsSnapshot()?.rows ?? []);

  readonly filteredRows = computed(() => {
    let rows = this.importedRows();
    const mes = this.filterMes();
    const vendedor = this.filterVendedor();
    if (mes) {
      rows = rows.filter((row) => row['MES'] === mes);
    }
    if (vendedor) {
      rows = rows.filter((row) => row['c_vendedor'] === vendedor);
    }
    return rows;
  });

  readonly totalPages = computed(() => {
    const count = this.filteredRows().length;
    return count === 0 ? 0 : Math.ceil(count / this.pageSize);
  });

  readonly pageRows = computed((): Record<string, string>[] => {
    const start = this.page() * this.pageSize;
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  readonly renderedRows = computed((): RenderedTableRow[] => {
    const cols = this.displayColumns();
    const rows = this.pageRows();
    const page = this.page();
    return rows.map((row, index) => ({
      id: this.trackRow(row, index),
      index: page * this.pageSize + index + 1,
      cells: cols.map((header) => row[header] ?? ''),
    }));
  });

  readonly effectiveTotal = computed(() => this.filteredRows().length);

  readonly hasActiveFilters = computed(() => !!this.filterMes() || !!this.filterVendedor());

  readonly paginationRowsLabel = computed(() => {
    const visible = this.effectiveTotal();
    const imported = this.importedRows().length;
    if (this.hasActiveFilters() && visible !== imported) {
      return { count: visible, detail: `de ${imported} filas importadas (filtro activo)` };
    }
    return { count: imported, detail: 'filas importadas' };
  });

  meses = signal<string[]>([]);
  vendedores = signal<string[]>([]);

  readonly filterMes = signal('');
  readonly filterVendedor = signal('');

  showColumnPanel = signal(false);

  importing = signal(false);
  saving = signal(false);
  exporting = signal(false);
  loadingDataset = signal(false);

  readonly showLoader = computed(
    () => this.importing() || this.saving() || this.exporting() || this.loadingDataset()
  );

  readonly loaderMessage = computed(() => {
    if (this.importing()) {
      return 'Importando...';
    }
    if (this.saving()) {
      return 'Guardando...';
    }
    if (this.exporting()) {
      return 'Exportando...';
    }
    if (this.loadingDataset()) {
      return 'Cargando datos...';
    }
    return 'Cargando...';
  });

  page = signal(0);

  draggedColumnHeader: string | null = null;
  dragOverColumnHeader: string | null = null;

  constructor() {
    afterNextRender(() => this.initializeView());

    effect(() => {
      const version = this.reportDataStore.persistedVersion();
      if (version === 0 || this.hasPendingSave()) {
        return;
      }

      const snap = this.reportDataStore.reportsSnapshot();
      if (!snap?.rows.length) {
        return;
      }

      const layout = this.buildColumnLayoutFromHeaders(snap.columns);
      this.applyColumnLayout(layout.order, layout.hidden, false);
      this.page.set(0);
      this.refreshFilterOptions();
    });

    effect(() => {
      const revision = this.appViewSettings.settings().revision;
      if (revision === this.lastAppliedViewRevision) {
        return;
      }

      const headers = this.resolveCurrentHeaders();
      if (!headers.length) {
        return;
      }

      this.lastAppliedViewRevision = revision;
      const layout = this.appViewSettings.buildReportsLayoutFromHeaders(headers);
      this.applyColumnLayout(layout.order, layout.hidden, true);
    });
  }

  private initializeView(): void {
    // Si hay una vista previa pendiente (importado pero no guardado), no pisar con datos de BD.
    if (this.hasPendingSave()) {
      this.restoreLayoutFromStore();
      this.refreshFilterOptions();
      return;
    }

    this.loadPersistedDatasetFromBackend();
  }

  private loadPersistedDatasetFromBackend(): void {
    this.loadingDataset.set(true);

    this.rgfmApi.loadDataset().subscribe({
      next: (dataset) => {
        if (dataset.total === 0 || dataset.rows.length === 0) {
          this.initializeColumnLayout();
          this.loadingDataset.set(false);
          return;
        }

        const layout = this.buildColumnLayoutFromHeaders(dataset.headers);
        this.applyColumnLayout(layout.order, layout.hidden, false);

        this.reportDataStore.loadPersisted({
          rows: dataset.rows,
          columns: layout.order,
          sourceFileName: dataset.sourceFileName,
          columnOrder: layout.order,
          hiddenColumns: [...layout.hidden],
        });

        this.refreshFilterOptions();
        this.loadingDataset.set(false);
      },
      error: (err) => {
        this.toast.showError(err as ResolvedApiError);
        this.initializeColumnLayout();
        this.loadingDataset.set(false);
      },
    });
  }

  private initializeColumnLayout(): void {
    this.applyColumnLayout([], new Set(), true);
  }

  private restoreLayoutFromStore(): void {
    const { order, hiddenColumns } = this.reportDataStore.getColumnLayout();
    const hidden = new Set(hiddenColumns);
    this.applyColumnLayout(order, hidden, true);
  }

  private applyColumnLayout(order: string[], hidden: Set<string>, persist: boolean): void {
    this.columnOrder.set(order);
    this.hiddenColumns.set(hidden);
    this.setBaselineColumnLayout(order, hidden);
    if (persist) {
      this.persistColumnLayout();
    }
  }

  private persistColumnLayout(): void {
    if (!this.canEdit()) {
      return;
    }
    this.reportDataStore.setColumnLayout(this.columnOrder(), this.hiddenColumns());
    this.appViewSettings.setReportsLayout(this.columnOrder(), this.hiddenColumns());
  }

  onFilterMesChange(value: string): void {
    this.filterMes.set(value);
    this.onFiltersChanged();
  }

  onFilterVendedorChange(value: string): void {
    this.filterVendedor.set(value);
    this.onFiltersChanged();
  }

  private onFiltersChanged(): void {
    this.page.set(0);
    this.refreshFilterOptions();
  }

  clearFilters(): void {
    this.filterMes.set('');
    this.filterVendedor.set('');
    this.page.set(0);
    if (this.canEdit()) {
      this.restoreBaselineColumnLayout();
    }
    this.refreshFilterOptions();
  }

  private refreshFilterOptions(): void {
    const rows = this.importedRows();
    this.meses.set(this.distinctColumnValues(rows, 'MES'));
    this.vendedores.set(this.distinctColumnValues(rows, 'c_vendedor'));
  }

  changePage(newPage: number): void {
    const maxPage = this.totalPages();
    if (newPage < 0 || newPage >= maxPage) {
      return;
    }
    this.page.set(newPage);
  }

  onColumnVisibilityChange(event: { header: string; visible: boolean }): void {
    this.toggleColumnVisibility(event.header, event.visible);
  }

  trackRow(row: Record<string, string>, index: number): string | number {
    const key = row['LLAVE'] ?? row['n_id_doc'];
    if (key) {
      return key;
    }
    return `${row['MES'] ?? ''}|${row['c_ruc'] ?? ''}|${row['c_vendedor'] ?? ''}|${index}`;
  }

  toggleColumnPanel(): void {
    this.showColumnPanel.update((v) => !v);
  }

  openImportDialog(): void {
    if (!this.canEdit()) {
      return;
    }
    this.fileInputRef?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    if (!this.canEdit()) {
      return;
    }
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const validationError = validateImportFile(file);
    if (validationError) {
      this.toast.showError(validationError);
      input.value = '';
      return;
    }

    this.importing.set(true);
    this.toast.dismiss();

    this.rgfmApi.importExcel(file!).subscribe({
      next: (result) => {
        const layout = this.buildColumnLayoutFromHeaders(result.headersFound);

        this.filterMes.set('');
        this.filterVendedor.set('');
        this.page.set(0);
        this.applyColumnLayout(layout.order, layout.hidden, false);

        this.reportDataStore.loadPreview(
          {
            rows: result.rows,
            columns: layout.order,
            sourceFileName: file!.name,
            columnOrder: layout.order,
            hiddenColumns: [...layout.hidden],
          },
          result.headersFound
        );

        this.refreshFilterOptions();

        this.toast.showSuccessTitle('Importado');
        this.importing.set(false);
        input.value = '';
      },
      error: (err) => {
        this.toast.showError(err as ResolvedApiError);
        this.importing.set(false);
        input.value = '';
      },
    });
  }

  saveToDatabase(): void {
    if (!this.canEdit()) {
      return;
    }
    const preview = this.reportDataStore.getPreviewForSave();
    if (!preview) {
      return;
    }

    this.saving.set(true);
    this.toast.dismiss();

    this.rgfmApi.saveImport(preview).subscribe({
      next: (result) => {
        const layout = this.buildColumnLayoutFromHeaders(result.headersPersisted);

        // Guardado OK: recargar desde backend para evitar stale data del navegador.
        this.rgfmApi.loadDataset().subscribe({
          next: (dataset) => {
            const persistedLayout = this.buildColumnLayoutFromHeaders(dataset.headers);
            this.reportDataStore.loadPersisted({
              rows: dataset.rows,
              columns: persistedLayout.order,
              sourceFileName: dataset.sourceFileName,
              columnOrder: persistedLayout.order,
              hiddenColumns: [...persistedLayout.hidden],
            });

            this.applyColumnLayout(persistedLayout.order, persistedLayout.hidden, false);
            this.appViewSettings.setReportsLayout(persistedLayout.order, persistedLayout.hidden);
            this.refreshFilterOptions();

            this.reportDataSync.noteLocalSave();
            this.toast.showSuccessTitle('Guardado en la DB');
            this.saving.set(false);
          },
          error: () => {
            // Si falla la recarga, al menos mantenemos el preview ya guardado.
            this.reportDataStore.loadPersisted({
              rows: preview.rows,
              columns: layout.order,
              sourceFileName: result.sourceFileName || preview.sourceFileName,
              columnOrder: layout.order,
              hiddenColumns: [...layout.hidden],
            });
            this.applyColumnLayout(layout.order, layout.hidden, false);
            this.appViewSettings.setReportsLayout(layout.order, layout.hidden);
            this.refreshFilterOptions();
            this.reportDataSync.noteLocalSave();
            this.toast.showSuccessTitle('Guardado en la DB');
            this.saving.set(false);
          },
        });
      },
      error: (err) => {
        this.toast.showError(err as ResolvedApiError);
        this.saving.set(false);
      },
    });
  }

  private buildColumnLayoutFromHeaders(headersFound: string[]): { order: string[]; hidden: Set<string> } {
    return this.appViewSettings.buildReportsLayoutFromHeaders(uniqueImportHeaders(headersFound));
  }

  private resolveCurrentHeaders(): string[] {
    const snap = this.reportDataStore.reportsSnapshot();
    if (!snap) {
      return [];
    }
    return uniqueImportHeaders(snap.columns);
  }

  private setBaselineColumnLayout(order: string[], hidden: Set<string>): void {
    this.baselineColumnOrder.set([...order]);
    this.baselineHiddenColumns.set(new Set(hidden));
  }

  private restoreBaselineColumnLayout(): void {
    this.columnOrder.set([...this.baselineColumnOrder()]);
    this.hiddenColumns.set(new Set(this.baselineHiddenColumns()));
    this.persistColumnLayout();
  }

  onColumnDragStart(header: string, event: DragEvent): void {
    if (!this.canEdit()) {
      event.preventDefault();
      return;
    }
    this.draggedColumnHeader = header;
    event.dataTransfer?.setData('text/plain', header);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onColumnDragOver(header: string, event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverColumnHeader = header;
  }

  onColumnDragLeave(): void {
    this.dragOverColumnHeader = null;
  }

  onColumnDrop(targetHeader: string, event: DragEvent): void {
    event.preventDefault();
    const source = this.draggedColumnHeader ?? event.dataTransfer?.getData('text/plain');
    if (source && source !== targetHeader) {
      this.moveColumn(source, targetHeader);
    }
    this.draggedColumnHeader = null;
    this.dragOverColumnHeader = null;
  }

  onColumnDragEnd(): void {
    this.draggedColumnHeader = null;
    this.dragOverColumnHeader = null;
  }

  moveColumn(sourceHeader: string, targetHeader: string): void {
    if (!this.canEdit()) {
      return;
    }
    const order = [...this.columnOrder()];
    const fromIndex = order.indexOf(sourceHeader);
    const toIndex = order.indexOf(targetHeader);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    order.splice(fromIndex, 1);
    order.splice(toIndex, 0, sourceHeader);
    this.columnOrder.set(order);
    this.persistColumnLayout();
  }

  exportExcel(): void {
    const columns = this.displayColumns();
    if (columns.length === 0) {
      this.toast.showError(resolvedError(ApiErrorCode.VALIDATION_ERROR, 'Seleccione al menos una columna.'));
      return;
    }

    if (this.effectiveTotal() === 0) {
      this.toast.showError(resolvedError(ApiErrorCode.EXCEL_EXPORT_EMPTY));
      return;
    }

    this.exporting.set(true);
    this.toast.dismiss();

    const mes = this.filterMes() || undefined;
    const vendedor = this.filterVendedor() || undefined;

    this.rgfmApi.exportExcel(columns, mes, vendedor).subscribe({
      next: ({ blob, filename }) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);

        this.toast.showSuccessTitle('Exportado');
        this.exporting.set(false);
      },
      error: (err) => {
        this.toast.showError(err as ResolvedApiError);
        this.exporting.set(false);
      },
    });
  }

  toggleColumnVisibility(header: string, visible: boolean): void {
    if (!this.canEdit()) {
      return;
    }
    const hidden = new Set(this.hiddenColumns());
    if (visible) {
      hidden.delete(header);
    } else {
      hidden.add(header);
    }
    this.hiddenColumns.set(hidden);
    this.persistColumnLayout();
  }

  showAllColumns(): void {
    if (!this.canEdit()) {
      return;
    }
    this.hiddenColumns.set(new Set());
    this.persistColumnLayout();
  }

  hideAllColumns(): void {
    if (!this.canEdit()) {
      return;
    }
    this.hiddenColumns.set(new Set(this.columnOrder()));
    this.persistColumnLayout();
  }

  isColumnDragTarget(header: string): boolean {
    return this.dragOverColumnHeader === header && this.draggedColumnHeader !== header;
  }

  isColumnDragging(header: string): boolean {
    return this.draggedColumnHeader === header;
  }

  private distinctColumnValues(rows: Record<string, string>[], header: string): string[] {
    const values = new Set<string>();
    for (const row of rows) {
      const value = row[header]?.trim();
      if (value) {
        values.add(value);
      }
    }
    return [...values].sort((a, b) => a.localeCompare(b, 'es'));
  }
}
