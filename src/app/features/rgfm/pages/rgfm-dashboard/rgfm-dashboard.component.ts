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
import { ApiErrorCode } from '../../../../core/constants';
import { ExcelImportService } from '../../../../core/services/excel-import.service';
import { resolvedError } from '../../../../core/utils/api-error.resolver';
import { validateImportFile } from '../../../../core/utils/validate-import-file';
import { ReportDataStoreService } from '../../../../core/services/report-data-store.service';
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

  private readonly excelImport = inject(ExcelImportService);
  private readonly reportDataStore = inject(ReportDataStoreService);
  protected readonly toast = inject(ToastService);
  readonly pageSize = 50;

  columnOrder = signal<string[]>([]);
  hiddenColumns = signal<Set<string>>(new Set());
  private readonly baselineColumnOrder = signal<string[]>([]);
  private readonly baselineHiddenColumns = signal<Set<string>>(new Set());

  readonly displayColumns = computed(() =>
    this.columnOrder().filter((header) => !this.hiddenColumns().has(header))
  );

  readonly importedRows = computed(() => this.reportDataStore.snapshot()?.rows ?? []);

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
  exporting = signal(false);

  readonly showLoader = computed(() => this.importing() || this.exporting());

  readonly loaderMessage = computed(() => {
    if (this.importing()) {
      return 'Importando...';
    }
    if (this.exporting()) {
      return 'Exportando...';
    }
    return 'Cargando...';
  });

  page = signal(0);

  draggedColumnHeader: string | null = null;
  dragOverColumnHeader: string | null = null;

  constructor() {
    afterNextRender(() => this.initializeView());
  }

  private initializeView(): void {
    if (this.reportDataStore.hasData()) {
      this.restoreLayoutFromStore();
      this.refreshFilterOptions();
      return;
    }
    this.initializeColumnLayout();
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
    this.reportDataStore.setColumnLayout(this.columnOrder(), this.hiddenColumns());
  }

  applyFilters(): void {
    this.page.set(0);
    this.refreshFilterOptions();
  }

  clearFilters(): void {
    this.filterMes.set('');
    this.filterVendedor.set('');
    this.page.set(0);
    this.restoreBaselineColumnLayout();
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
    this.fileInputRef?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
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

    try {
      const result = await this.excelImport.parseFile(file!);
      const layout = this.buildImportedColumnLayout(result.headersFound);

      this.filterMes.set('');
      this.filterVendedor.set('');
      this.page.set(0);
      this.applyColumnLayout(layout.order, layout.hidden, false);

      this.reportDataStore.loadFromImport({
        rows: result.rows ?? [],
        columns: layout.order,
        sourceFileName: file!.name,
        columnOrder: layout.order,
        hiddenColumns: [...layout.hidden],
      });

      this.refreshFilterOptions();

      this.toast.showSuccess(
        'Excel cargado',
        `${result.rowsImported} filas · ${result.headersFound.length} columnas. Disponible en Reportes, Gráficos y Resumen.`
      );
    } catch (err) {
      this.toast.showError(err as ResolvedApiError);
    } finally {
      this.importing.set(false);
      input.value = '';
    }
  }

  private buildImportedColumnLayout(headersFound: string[]): { order: string[]; hidden: Set<string> } {
    return {
      order: uniqueImportHeaders(headersFound),
      hidden: new Set<string>(),
    };
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

    const rows = this.filteredRows();
    const baseName =
      this.reportDataStore.sourceFileName().replace(/\.(xlsx|xls)$/i, '') || 'Reportes';
    const filename = `${baseName}_export_${this.timestamp()}.xlsx`;

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
  }

  toggleColumnVisibility(header: string, visible: boolean): void {
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
    this.hiddenColumns.set(new Set());
    this.persistColumnLayout();
  }

  hideAllColumns(): void {
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

  private timestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  }
}
