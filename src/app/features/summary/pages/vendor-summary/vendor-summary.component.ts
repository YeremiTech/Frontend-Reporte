import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RgfmApiService } from '../../../../core/services/api.service';
import { ReportDataStoreService } from '../../../../core/services/report-data-store.service';
import { uniqueImportHeaders } from '../../../../core/models/rgfm.model';
import { VendorSummaryService } from '../../../../core/services/vendor-summary.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EMPTY_STATE_PRESETS } from '../../../../shared/components/empty-state/empty-state.presets';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';

@Component({
  selector: 'app-vendor-summary',
  standalone: true,
  imports: [PageShellComponent, EmptyStateComponent],
  templateUrl: './vendor-summary.component.html',
  styleUrl: './vendor-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VendorSummaryComponent {
  readonly emptyPreset = EMPTY_STATE_PRESETS.resumen;

  readonly dataStore = inject(ReportDataStoreService);
  private readonly vendorReport = inject(VendorSummaryService);
  private readonly rgfmApi = inject(RgfmApiService);

  readonly hasData = this.dataStore.hasPersistedData;

  constructor() {
    afterNextRender(() => this.ensurePersistedDataset());
  }

  private ensurePersistedDataset(): void {
    if (this.dataStore.hasPersistedData()) {
      return;
    }

    this.rgfmApi.loadDataset().subscribe({
      next: (dataset) => {
        if (dataset.total === 0 || dataset.rows.length === 0) {
          return;
        }

        const headers = uniqueImportHeaders(dataset.headers);
        this.dataStore.loadPersisted({
          rows: dataset.rows,
          columns: headers,
          sourceFileName: dataset.sourceFileName,
          columnOrder: headers,
          hiddenColumns: [],
        });
      },
    });
  }

  /** Vendedores completos por página (evita cortar un bloque y romper rowspan). */
  readonly vendorsPerPage = 8;
  readonly page = signal(0);

  readonly report = computed(() => {
    const snap = this.dataStore.persistedSnapshot();
    if (!snap) {
      return null;
    }
    return this.vendorReport.buildVendorView(snap.rows, snap.columns);
  });

  readonly allRows = computed(() => this.report()?.rows ?? []);

  readonly vendorBlocks = computed(() => {
    const rows = this.allRows();
    const blocks: typeof rows[] = [];
    let current: typeof rows = [];
    for (const row of rows) {
      if (row.rowType === 'vendor-header' && current.length > 0) {
        blocks.push(current);
        current = [];
      }
      current.push(row);
    }
    if (current.length > 0) {
      blocks.push(current);
    }
    return blocks;
  });

  readonly totalPages = computed(() => {
    const count = this.vendorBlocks().length;
    return count === 0 ? 0 : Math.ceil(count / this.vendorsPerPage);
  });

  readonly pageRows = computed(() => {
    const start = this.page() * this.vendorsPerPage;
    return this.vendorBlocks()
      .slice(start, start + this.vendorsPerPage)
      .flat();
  });

  changePage(newPage: number): void {
    const max = this.totalPages();
    if (newPage < 0 || newPage >= max) {
      return;
    }
    this.page.set(newPage);
  }
}
