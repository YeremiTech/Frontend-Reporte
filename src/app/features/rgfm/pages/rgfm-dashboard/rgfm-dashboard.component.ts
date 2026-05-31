import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, from, of, switchMap, throwError } from 'rxjs';
import { ApiErrorCode } from '../../../../core/constants';
import { parseHttpErrorFromBlob, RgfmApiService } from '../../../../core/services/rgfm-api.service';
import { resolvedError, resolveApiError } from '../../../../core/utils/api-error.resolver';
import { validateImportFile } from '../../../../core/utils/validate-import-file';
import { ReportDataStoreService } from '../../../../core/services/report-data-store.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';
import { TailgridsAlertComponent } from '../../../../shared/components/tailgrids-alert/tailgrids-alert.component';
import {
  cellValueForRow,
  ImportResult,
  mergeColumnOrder,
  RgfmRecord,
  RgfmTableRow,
} from '../../../../core/models/rgfm.model';

@Component({
  selector: 'app-rgfm-dashboard',
  standalone: true,
  imports: [FormsModule, TailgridsAlertComponent, LoaderComponent, PageShellComponent],
  templateUrl: './rgfm-dashboard.component.html',
  styleUrl: './rgfm-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RgfmDashboardComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly api = inject(RgfmApiService);
  private readonly reportDataStore = inject(ReportDataStoreService);
  protected readonly toast = inject(ToastService);
  readonly pageSize = 50;

  readonly usingPreviewData = signal(false);
  readonly dataPersistedInDb = signal(false);
  previewRows = signal<Record<string, string>[]>([]);
  private lastImportedFileName = '';

  records = signal<RgfmRecord[]>([]);
  total = signal(0);
  page = signal(0);
  totalPages = signal(0);

  columnOrder = signal<string[]>([]);
  hiddenColumns = signal<Set<string>>(new Set());

  readonly displayColumns = computed(() =>
    this.columnOrder().filter((header) => !this.hiddenColumns().has(header))
  );

  readonly filteredPreviewRows = computed(() => {
    let rows = this.previewRows();
    if (this.filterMes) {
      rows = rows.filter((row) => row['MES'] === this.filterMes);
    }
    if (this.filterVendedor) {
      rows = rows.filter((row) => row['c_vendedor'] === this.filterVendedor);
    }
    return rows;
  });

  readonly previewTotalPages = computed(() => {
    const count = this.filteredPreviewRows().length;
    return count === 0 ? 0 : Math.ceil(count / this.pageSize);
  });

  readonly pageRows = computed((): RgfmTableRow[] => {
    if (this.usingPreviewData()) {
      const start = this.page() * this.pageSize;
      return this.filteredPreviewRows().slice(start, start + this.pageSize);
    }
    return this.records();
  });

  readonly effectiveTotal = computed(() =>
    this.usingPreviewData() ? this.filteredPreviewRows().length : this.total()
  );

  readonly effectiveTotalPages = computed(() =>
    this.usingPreviewData() ? this.previewTotalPages() : this.totalPages()
  );

  readonly hasActiveFilters = computed(() => !!this.filterMes || !!this.filterVendedor);

  readonly paginationRowsLabel = computed(() => {
    const visible = this.effectiveTotal();
    if (!this.usingPreviewData()) {
      return { count: visible, detail: 'filas en total' };
    }
    const imported = this.previewRows().length;
    if (this.hasActiveFilters() && visible !== imported) {
      return { count: visible, detail: `de ${imported} filas importadas (filtro activo)` };
    }
    return { count: imported, detail: 'filas importadas' };
  });

  meses = signal<string[]>([]);
  vendedores = signal<string[]>([]);

  filterMes = '';
  filterVendedor = '';

  showColumnPanel = signal(false);

  loading = signal(false);
  importing = signal(false);
  exporting = signal(false);
  saving = signal(false);

  readonly canSaveToDatabase = computed(
    () => this.usingPreviewData() && this.previewRows().length > 0 && !this.saving()
  );

  readonly showLoader = computed(
    () => this.loading() || this.importing() || this.exporting() || this.saving()
  );

  readonly loaderMessage = computed(() => {
    if (this.saving()) {
      return 'Guardando en BD...';
    }
    if (this.importing()) {
      return 'Importando...';
    }
    if (this.exporting()) {
      return 'Exportando...';
    }
    if (this.loading()) {
      return 'Cargando...';
    }
    return 'Cargando...';
  });

  draggedColumnHeader: string | null = null;
  dragOverColumnHeader: string | null = null;

  constructor() {
    afterNextRender(() => this.scheduleBackgroundLoads());
  }

  private scheduleBackgroundLoads(): void {
    const run = () => this.loadInitialData();

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: 2500 });
    } else {
      setTimeout(run, 100);
    }
  }

  private loadInitialData(): void {
    forkJoin({
      headers: this.api.getHeaders(),
      filters: this.api.getFilters(),
      probe: this.api.listRecords({ page: 0, size: 1 }),
    }).subscribe({
      next: ({ headers, filters, probe }) => {
        this.columnOrder.set([...(headers.expectedHeaders ?? [])]);
        this.hiddenColumns.set(new Set());
        this.meses.set(filters.meses ?? []);
        this.vendedores.set(filters.vendedores ?? []);
        if ((probe.total ?? 0) > 0) {
          this.dataPersistedInDb.set(true);
          this.loadRecords();
        }
      },
      error: (err) => this.toast.showError(err),
    });
  }

  private loadFilterOptions(): void {
    this.api.getFilters().subscribe({
      next: (response) => {
        this.meses.set(response.meses ?? []);
        this.vendedores.set(response.vendedores ?? []);
      },
      error: (err) => this.toast.showError(err),
    });
  }

  loadRecords(): void {
    this.loading.set(true);
    this.toast.dismiss();

    this.api
      .listRecords({
        page: this.page(),
        size: this.pageSize,
        mes: this.filterMes || undefined,
        vendedor: this.filterVendedor || undefined,
      })
      .subscribe({
        next: (response) => {
          this.usingPreviewData.set(false);
          this.previewRows.set([]);
          this.records.set(response.data ?? []);
          this.total.set(response.total ?? 0);
          this.page.set(response.page ?? 0);
          this.totalPages.set(response.totalPages ?? 0);
          this.dataPersistedInDb.set((response.total ?? 0) > 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.toast.showError(err);
          this.loading.set(false);
        },
      });
  }

  applyFilters(): void {
    this.page.set(0);
    if (this.usingPreviewData()) {
      this.refreshPreviewFilters();
      return;
    }
    this.loadRecords();
  }

  clearFilters(): void {
    this.filterMes = '';
    this.filterVendedor = '';
    this.page.set(0);
    if (this.usingPreviewData()) {
      this.refreshPreviewFilters();
      return;
    }
    this.loadRecords();
  }

  private refreshPreviewFilters(): void {
    const rows = this.previewRows();
    this.meses.set(this.distinctColumnValues(rows, 'MES'));
    this.vendedores.set(this.distinctColumnValues(rows, 'c_vendedor'));
  }

  changePage(newPage: number): void {
    const maxPage = this.effectiveTotalPages();
    if (newPage < 0 || newPage >= maxPage) {
      return;
    }
    this.page.set(newPage);
    if (!this.usingPreviewData()) {
      this.loadRecords();
    }
  }

  rowNumber(index: number): number {
    return this.page() * this.pageSize + index + 1;
  }

  cellValue(row: RgfmTableRow, header: string): string {
    return cellValueForRow(row, header);
  }

  trackRow(row: RgfmTableRow, index: number): string | number {
    if ('id' in row && row.id != null) {
      return row.id;
    }
    const map = row as Record<string, string>;
    const key = map['LLAVE'] ?? map['n_id_doc'];
    if (key) {
      return key;
    }
    return `${map['MES'] ?? ''}|${map['c_ruc'] ?? ''}|${map['c_vendedor'] ?? ''}|${index}`;
  }

  toggleColumnPanel(): void {
    this.showColumnPanel.update((v) => !v);
  }

  openImportDialog(): void {
    this.fileInputRef?.nativeElement.click();
  }

  saveToDatabase(): void {
    const rows = this.previewRows();
    if (!this.usingPreviewData() || rows.length === 0) {
      this.toast.showError(
        resolvedError(ApiErrorCode.VALIDATION_ERROR, 'Importe un Excel antes de guardar en la base de datos.')
      );
      return;
    }

    const confirmed = window.confirm(
      'Se eliminarán todos los datos anteriores en la base de datos y se guardará esta importación. ¿Desea continuar?'
    );
    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.toast.dismiss();

    this.api
      .saveImport({
        rows,
        sourceFileName: this.lastImportedFileName || undefined,
      })
      .subscribe({
        next: (result) => {
          this.syncReportDataStore(this.lastImportedFileName || result.sourceFileName);
          this.usingPreviewData.set(false);
          this.dataPersistedInDb.set(true);
          this.previewRows.set([]);
          this.page.set(0);
          this.filterMes = '';
          this.filterVendedor = '';
          this.loadFilterOptions();
          this.loadRecords();
          this.toast.showSuccess(
            'Guardado en BD',
            result.message || `${result.rowsSaved} filas guardadas.`
          );
          this.saving.set(false);
        },
        error: (err) => {
          this.toast.showError(err);
          this.saving.set(false);
        },
      });
  }

  onFileSelected(event: Event): void {
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

    this.api.importExcel(file!).subscribe({
      next: (result) => {
        this.applyImportedColumnLayout(result);
        this.usingPreviewData.set(true);
        this.dataPersistedInDb.set(false);
        this.previewRows.set(result.rows ?? []);
        this.lastImportedFileName = file!.name;
        this.page.set(0);
        this.refreshPreviewFilters();
        this.toast.showSuccess(
          'Excel cargado',
          `${result.rowsImported} filas · ${result.headersFound.length} columnas. Use «Guardar en BD» para persistir.`
        );
        this.importing.set(false);
        this.filterMes = '';
        this.filterVendedor = '';
        this.syncReportDataStore(file!.name);
        input.value = '';
      },
      error: (err) => {
        this.toast.showError(err);
        this.importing.set(false);
        input.value = '';
      },
    });
  }

  private applyImportedColumnLayout(result: ImportResult): void {
    const standard = this.columnOrder().length ? this.columnOrder() : result.headersFound;
    const order = mergeColumnOrder(result.headersFound, standard);
    const foundSet = new Set(result.headersFound);
    const hidden = new Set(order.filter((header) => !foundSet.has(header)));

    this.columnOrder.set(order);
    this.hiddenColumns.set(hidden);
  }

  onColumnDragStart(header: string, event: DragEvent): void {
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
    const order = [...this.columnOrder()];
    const fromIndex = order.indexOf(sourceHeader);
    const toIndex = order.indexOf(targetHeader);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    order.splice(fromIndex, 1);
    order.splice(toIndex, 0, sourceHeader);
    this.columnOrder.set(order);
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

    if (this.usingPreviewData()) {
      const rows = this.filteredPreviewRows();
      const filename = `Reportes_export_${this.timestamp()}.xlsx`;
      import('../../../../core/utils/excel-preview-export')
        .then(({ exportPreviewRowsToExcel }) => exportPreviewRowsToExcel(columns, rows, filename))
        .then(() => {
          this.toast.showSuccess('Exportado', `${rows.length} filas · ${columns.length} columnas.`);
        })
        .catch(() => {
          this.toast.showError(
            resolvedError(ApiErrorCode.UNKNOWN_ERROR, 'No se pudo generar el archivo Excel.')
          );
        })
        .finally(() => this.exporting.set(false));
      return;
    }

    const filters = {
      mes: this.filterMes || undefined,
      vendedor: this.filterVendedor || undefined,
    };

    this.api
      .exportExcel(columns, filters)
      .pipe(
        catchError((err: HttpErrorResponse) =>
          from(parseHttpErrorFromBlob(err)).pipe(switchMap((resolved) => throwError(() => resolved)))
        )
      )
      .subscribe({
        next: (blob) => {
          this.downloadBlob(blob, `Reportes_export_${this.timestamp()}.xlsx`);
          this.toast.showSuccess('Exportado', 'Archivo descargado.');
          this.exporting.set(false);
        },
        error: (err) => {
          this.toast.showError(err);
          this.exporting.set(false);
        },
      });
  }

  isColumnVisible(header: string): boolean {
    return !this.hiddenColumns().has(header);
  }

  toggleColumnVisibility(header: string, visible: boolean): void {
    const hidden = new Set(this.hiddenColumns());
    if (visible) {
      hidden.delete(header);
    } else {
      hidden.add(header);
    }
    this.hiddenColumns.set(hidden);
    this.syncReportDataStoreColumns();
  }

  showAllColumns(): void {
    this.hiddenColumns.set(new Set());
    this.syncReportDataStoreColumns();
  }

  hideAllColumns(): void {
    this.hiddenColumns.set(new Set(this.columnOrder()));
    this.syncReportDataStoreColumns();
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

  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  private syncReportDataStore(sourceLabel?: string): void {
    if (!this.usingPreviewData() || !this.previewRows().length) {
      return;
    }
    this.reportDataStore.setDataset({
      rows: this.previewRows(),
      columns: this.displayColumns(),
      sourceLabel,
    });
  }

  private syncReportDataStoreColumns(): void {
    if (!this.usingPreviewData() || !this.previewRows().length) {
      return;
    }
    this.reportDataStore.updateColumns(this.displayColumns());
  }

  private timestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  }
}
