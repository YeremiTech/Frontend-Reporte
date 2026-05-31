import { ChangeDetectionStrategy, Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  ChartAggregation,
  ChartKind,
  ChartOptions,
  ColumnMeta,
} from '../../../../core/models/chart.model';
import { ChartAnalyticsService } from '../../../../core/services/chart-analytics.service';
import { ReportDataStoreService } from '../../../../core/services/report-data-store.service';
import { ApexChartComponent } from '../../../../shared/components/apex-chart/apex-chart.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EMPTY_STATE_PRESETS } from '../../../../shared/components/empty-state/empty-state.presets';
import { LoaderComponent } from '../../../../shared/components/loader/loader.component';
import { PageShellComponent } from '../../../../shared/components/page-shell/page-shell.component';

const CHART_PANELS: { kind: ChartKind; label: string; icon: string }[] = [
  { kind: 'bar', label: 'Barras', icon: 'bi-bar-chart-fill' },
  { kind: 'line', label: 'Línea', icon: 'bi-graph-up' },
  { kind: 'donut', label: 'Donut', icon: 'bi-pie-chart-fill' },
  { kind: 'radialBar', label: 'Radial', icon: 'bi-bullseye' },
];

export interface SharedChartConfig {
  categoryColumn: string;
  valueColumn?: string;
  aggregation: ChartAggregation;
  title: string;
  topN: number;
}

export interface ChartPanelView {
  kind: ChartKind;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-charts-dashboard',
  standalone: true,
  imports: [FormsModule, ApexChartComponent, PageShellComponent, EmptyStateComponent, LoaderComponent],
  templateUrl: './charts-dashboard.component.html',
  styleUrl: './charts-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsDashboardComponent {
  readonly emptyPreset = EMPTY_STATE_PRESETS.graficos;

  private readonly dataStore = inject(ReportDataStoreService);
  private readonly analytics = inject(ChartAnalyticsService);

  readonly loading = this.dataStore.loading;
  readonly hasData = this.dataStore.hasData;
  readonly topNDraft = signal(12);

  private optionsCacheKey = '';
  private readonly optionsCache = new Map<ChartKind, ChartOptions | null>();
  private topNDebounceId: ReturnType<typeof setTimeout> | null = null;

  readonly columnMeta = computed(() => {
    const snap = this.dataStore.snapshot();
    if (!snap) {
      return [] as ColumnMeta[];
    }
    return this.analytics.analyzeColumns(snap.rows, snap.columns);
  });

  readonly categoryColumns = computed(() =>
    this.columnMeta().filter((m) => m.role !== 'numeric')
  );

  readonly valueColumns = computed(() =>
    this.columnMeta().filter((m) => m.role !== 'category')
  );

  config = signal<SharedChartConfig>({
    categoryColumn: '',
    valueColumn: undefined,
    aggregation: 'sum',
    title: '',
    topN: 12,
  });

  readonly chartPanels = CHART_PANELS;

  readonly hasAnyChart = computed(() => {
    const snap = this.dataStore.snapshot();
    const cfg = this.config();
    return !!snap && !!cfg.categoryColumn;
  });

  buildPanelOptions(kind: ChartKind): ChartOptions | null {
    const snap = this.dataStore.snapshot();
    const cfg = this.config();
    if (!snap || !cfg.categoryColumn) {
      return null;
    }

    const cacheKey = this.buildOptionsCacheKey(cfg, snap.rows.length);
    if (this.optionsCacheKey !== cacheKey) {
      this.optionsCacheKey = cacheKey;
      this.optionsCache.clear();
    }

    const cached = this.optionsCache.get(kind);
    if (cached !== undefined) {
      return cached;
    }

    const options = this.analytics.buildChartOptions(
      snap.rows,
      {
        kind,
        categoryColumn: cfg.categoryColumn,
        valueColumn: cfg.valueColumn,
        aggregation: cfg.aggregation,
        title: cfg.title,
        topN: cfg.topN,
      },
      { compact: true }
    );
    this.optionsCache.set(kind, options);
    return options;
  }

  constructor() {
    afterNextRender(() => {
      void this.dataStore.refreshFromDatabase();
    });

    effect(() => {
      this.topNDraft.set(this.config().topN);
      this.optionsCache.clear();
      this.optionsCacheKey = '';
    });

    effect(() => {
      const meta = this.columnMeta();
      if (!meta.length) {
        return;
      }
      const current = this.config();
      if (current.categoryColumn && meta.some((m) => m.name === current.categoryColumn)) {
        return;
      }
      const suggested = this.analytics.suggestConfig(meta);
      this.config.set({
        categoryColumn: suggested.categoryColumn ?? meta[0].name,
        valueColumn: suggested.valueColumn,
        aggregation: suggested.aggregation ?? 'sum',
        title: '',
        topN: suggested.topN ?? 12,
      });
    });
  }

  onCategoryChange(column: string): void {
    this.config.update((c) => ({ ...c, categoryColumn: column }));
  }

  onValueChange(column: string): void {
    this.config.update((c) => ({
      ...c,
      valueColumn: column || undefined,
      aggregation: column ? c.aggregation : 'count',
    }));
  }

  onAggregationChange(aggregation: ChartAggregation): void {
    this.config.update((c) => ({ ...c, aggregation }));
  }

  onTitleChange(title: string): void {
    this.config.update((c) => ({ ...c, title }));
  }

  onTopNChange(topN: number): void {
    const clamped = Math.max(3, Math.min(30, topN));
    this.topNDraft.set(clamped);

    if (this.topNDebounceId !== null) {
      clearTimeout(this.topNDebounceId);
    }

    this.topNDebounceId = setTimeout(() => {
      this.config.update((c) => ({ ...c, topN: clamped }));
      this.topNDebounceId = null;
    }, 250);
  }

  private buildOptionsCacheKey(cfg: SharedChartConfig, rowCount: number): string {
    return [
      cfg.categoryColumn,
      cfg.valueColumn ?? '',
      cfg.aggregation,
      cfg.title,
      cfg.topN,
      rowCount,
    ].join('|');
  }
}
