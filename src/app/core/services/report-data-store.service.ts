import { Injectable, computed, signal } from '@angular/core';
import type { ReportDatasetSnapshot } from '../models/chart.model';

@Injectable({ providedIn: 'root' })
export class ReportDataStoreService {
  private readonly rowsSignal = signal<Record<string, string>[]>([]);
  private readonly columnsSignal = signal<string[]>([]);
  private readonly sourceLabelSignal = signal<string | null>(null);
  private readonly updatedAtSignal = signal<number | null>(null);

  readonly rows = this.rowsSignal.asReadonly();
  readonly columns = this.columnsSignal.asReadonly();
  readonly sourceLabel = this.sourceLabelSignal.asReadonly();
  readonly updatedAt = this.updatedAtSignal.asReadonly();

  readonly hasData = computed(() => this.rowsSignal().length > 0);

  readonly snapshot = computed((): ReportDatasetSnapshot | null => {
    if (!this.hasData()) {
      return null;
    }
    return {
      rows: this.rowsSignal(),
      columns: this.columnsSignal(),
      sourceLabel: this.sourceLabelSignal() ?? undefined,
      updatedAt: this.updatedAtSignal() ?? Date.now(),
    };
  });

  setDataset(params: {
    rows: Record<string, string>[];
    columns: string[];
    sourceLabel?: string;
  }): void {
    this.rowsSignal.set([...params.rows]);
    this.columnsSignal.set([...params.columns]);
    this.sourceLabelSignal.set(params.sourceLabel ?? null);
    this.updatedAtSignal.set(Date.now());
  }

  updateColumns(columns: string[]): void {
    if (!this.hasData()) {
      return;
    }
    this.columnsSignal.set([...columns]);
    this.updatedAtSignal.set(Date.now());
  }

  clear(): void {
    this.rowsSignal.set([]);
    this.columnsSignal.set([]);
    this.sourceLabelSignal.set(null);
    this.updatedAtSignal.set(null);
  }
}
