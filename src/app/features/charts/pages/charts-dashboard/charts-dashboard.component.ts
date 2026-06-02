import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  ChartAggregation,
  ChartKind,
  ChartOptions,
  ColumnMeta,
} from '../../../../core/models/chart.model';
import { AppViewSettingsService } from '../../../../core/services/app-view-settings.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ChartAnalyticsService } from '../../../../core/services/chart-analytics.service';
import { RgfmApiService } from '../../../../core/services/api.service';
import { ReportDataStoreService } from '../../../../core/services/report-data-store.service';
import { uniqueImportHeaders } from '../../../../core/models/rgfm.model';
import { ApexChartComponent } from '../../../../shared/components/apex-chart/apex-chart.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { EMPTY_STATE_PRESETS } from '../../../../shared/components/empty-state/empty-state.presets';
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

interface ChartPanelView {
  kind: ChartKind;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-charts-dashboard',
  standalone: true,
  imports: [FormsModule, ApexChartComponent, PageShellComponent, EmptyStateComponent],
  templateUrl: './charts-dashboard.component.html',
  styleUrl: './charts-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartsDashboardComponent {
  readonly emptyPreset = EMPTY_STATE_PRESETS.graficos;

  private readonly dataStore = inject(ReportDataStoreService);
  private readonly analytics = inject(ChartAnalyticsService);
  private readonly rgfmApi = inject(RgfmApiService);
  private readonly appViewSettings = inject(AppViewSettingsService);
  private readonly auth = inject(AuthService);

  private lastAppliedChartsRevision = -1;

  readonly hasData = this.dataStore.hasPersistedData;

  readonly topNDraft = signal(12);
  private topNDebounceId: ReturnType<typeof setTimeout> | null = null;

  readonly columnMeta = computed(() => {
    const snap = this.dataStore.persistedSnapshot();
    if (!snap) {
      return [] as ColumnMeta[];
    }
    return this.analytics.analyzeColumns(snap.rows, snap.columns);
  });

  readonly categoryColumns = computed(() =>
    this.columnMeta().filter((m) => this.analytics.isChartCategoryColumn(m))
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

  /** Solo monta ApexCharts en paneles expandidos (mejor tiempo de carga inicial). */
  private readonly expandedPanels = signal<ReadonlySet<ChartKind>>(new Set<ChartKind>(['bar']));

  readonly fullscreenPanel = signal<ChartKind | null>(null);

  private lastColumnSignature = '';

  readonly hasAnyChart = computed(() => {
    const snap = this.dataStore.persistedSnapshot();
    const cfg = this.config();
    return !!snap && !!cfg.categoryColumn;
  });

  readonly chartOptionsByKind = computed(() => {
    const snap = this.dataStore.persistedSnapshot();
    const cfg = this.config();
    const map = new Map<ChartKind, ChartOptions | null>();

    if (!snap || !cfg.categoryColumn) {
      return map;
    }

    for (const panel of CHART_PANELS) {
      map.set(
        panel.kind,
        this.analytics.buildChartOptions(
          snap.rows,
          {
            kind: panel.kind,
            categoryColumn: cfg.categoryColumn,
            valueColumn: cfg.valueColumn,
            aggregation: cfg.aggregation,
            title: cfg.title,
            topN: cfg.topN,
          },
          { compact: false }
        )
      );
    }

    return map;
  });

  panelOptions(kind: ChartKind, view: 'panel' | 'fullscreen' = 'panel'): ChartOptions | null {
    const options = this.chartOptionsByKind().get(kind) ?? null;
    if (!options?.chart || view !== 'fullscreen') {
      return options;
    }

    return {
      ...options,
      chart: {
        ...options.chart,
        height: this.fullscreenChartHeight(),
      },
    };
  }

  constructor() {
    afterNextRender(() => this.ensurePersistedDataset());

    effect(() => {
      this.topNDraft.set(this.config().topN);
    });

    effect(() => {
      const snap = this.dataStore.persistedSnapshot();
      const categories = this.categoryColumns();
      const values = this.valueColumns();

      if (!snap || !categories.length) {
        if (!snap) {
          this.lastColumnSignature = '';
        }
        return;
      }

      const signature = snap.columns.join('\u0001');
      const isNewDataset = signature !== this.lastColumnSignature;

      if (isNewDataset) {
        this.lastColumnSignature = signature;
        if (this.applySavedChartsConfig(categories, values)) {
          return;
        }
        const firstCategory = categories[0].name;
        const firstValue = values[0]?.name;
        this.config.set({
          categoryColumn: firstCategory,
          valueColumn: firstValue,
          aggregation: firstValue ? 'sum' : 'count',
          title: '',
          topN: 12,
        });
        this.pushChartsSettings();
        return;
      }

      const current = this.config();
      const categoryValid = categories.some((column) => column.name === current.categoryColumn);
      const valueValid =
        !current.valueColumn || values.some((column) => column.name === current.valueColumn);

      if (categoryValid && valueValid) {
        return;
      }

      const firstValue = values[0]?.name;
      this.config.set({
        ...current,
        categoryColumn: categoryValid ? current.categoryColumn : categories[0].name,
        valueColumn: valueValid ? current.valueColumn : firstValue,
        aggregation: valueValid && current.valueColumn ? current.aggregation : firstValue ? 'sum' : 'count',
      });
      this.pushChartsSettings();
    });

    effect(() => {
      const revision = this.appViewSettings.settings().revision;
      if (revision === this.lastAppliedChartsRevision) {
        return;
      }
      const categories = this.categoryColumns();
      const values = this.valueColumns();
      if (!categories.length) {
        return;
      }
      if (!this.applySavedChartsConfig(categories, values)) {
        return;
      }
      this.lastAppliedChartsRevision = revision;
    });
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

  onCategoryChange(column: string): void {
    this.config.update((c) => ({ ...c, categoryColumn: column }));
    this.pushChartsSettings();
  }

  onValueChange(column: string): void {
    this.config.update((c) => ({
      ...c,
      valueColumn: column || undefined,
      aggregation: column ? c.aggregation : 'count',
    }));
    this.pushChartsSettings();
  }

  onAggregationChange(aggregation: ChartAggregation): void {
    this.config.update((c) => ({ ...c, aggregation }));
    this.pushChartsSettings();
  }

  onTitleChange(title: string): void {
    this.config.update((c) => ({ ...c, title }));
    this.pushChartsSettings();
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
      this.pushChartsSettings();
    }, 250);
  }

  isPanelExpanded(kind: ChartKind): boolean {
    return this.expandedPanels().has(kind);
  }

  togglePanel(kind: ChartKind): void {
    this.expandedPanels.update((current) => {
      const next = new Set(current);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
    this.pushChartsSettings();
  }

  private applySavedChartsConfig(
    categories: ColumnMeta[],
    values: ColumnMeta[]
  ): boolean {
    const saved = this.appViewSettings.chartsLayout();
    if (!saved?.categoryColumn) {
      return false;
    }

    const categoryValid = categories.some((column) => column.name === saved.categoryColumn);
    if (!categoryValid) {
      return false;
    }

    const valueValid =
      !saved.valueColumn || values.some((column) => column.name === saved.valueColumn);

    this.config.set({
      categoryColumn: saved.categoryColumn,
      valueColumn: valueValid ? saved.valueColumn : values[0]?.name,
      aggregation: saved.aggregation ?? 'sum',
      title: saved.title ?? '',
      topN: saved.topN ?? 12,
    });

    const panels = (saved.expandedPanels ?? ['bar']).filter((kind): kind is ChartKind =>
      CHART_PANELS.some((panel) => panel.kind === kind)
    );
    this.expandedPanels.set(new Set(panels.length > 0 ? panels : ['bar']));
    return true;
  }

  private pushChartsSettings(): void {
    if (!this.auth.isAdmin()) {
      return;
    }

    const cfg = this.config();
    if (!cfg.categoryColumn) {
      return;
    }

    this.appViewSettings.setChartsLayout({
      categoryColumn: cfg.categoryColumn,
      valueColumn: cfg.valueColumn,
      aggregation: cfg.aggregation,
      title: cfg.title,
      topN: cfg.topN,
      expandedPanels: [...this.expandedPanels()],
    });
  }

  panelToggleLabel(kind: ChartKind, label: string): string {
    return this.isPanelExpanded(kind) ? `Ocultar gráfico ${label}` : `Mostrar gráfico ${label}`;
  }

  panelFullscreenLabel(label: string): string {
    return `Ver gráfico ${label} en pantalla completa`;
  }

  fullscreenPanelMeta(): ChartPanelView | null {
    const kind = this.fullscreenPanel();
    if (!kind) {
      return null;
    }
    return this.chartPanels.find((panel) => panel.kind === kind) ?? null;
  }

  openFullscreen(kind: ChartKind): void {
    this.fullscreenPanel.set(kind);
  }

  closeFullscreen(): void {
    this.fullscreenPanel.set(null);
  }

  private fullscreenChartHeight(): number {
    if (typeof window === 'undefined') {
      return 520;
    }
    return Math.max(Math.floor(window.innerHeight * 0.72), 420);
  }
}
