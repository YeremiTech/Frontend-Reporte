import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  viewChild,
} from '@angular/core';
import type { ApexOptions } from 'apexcharts';
import type ApexCharts from 'apexcharts';
import type { ChartOptions } from '../../../core/models/chart.model';

const APEX_OPTION_KEYS: (keyof ChartOptions)[] = [
  'series',
  'chart',
  'xaxis',
  'yaxis',
  'title',
  'dataLabels',
  'stroke',
  'fill',
  'legend',
  'tooltip',
  'plotOptions',
  'responsive',
  'colors',
  'labels',
  'markers',
];

@Component({
  selector: 'app-apex-chart',
  standalone: true,
  template: `<div #chartHost class="apex-chart-host"></div>`,
  styleUrl: './apex-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApexChartComponent implements OnDestroy {
  readonly options = input<ChartOptions | null>(null);

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('chartHost');
  private chart: ApexCharts | null = null;
  private renderGeneration = 0;

  constructor() {
    effect(() => {
      const opts = this.options();
      const host = this.host();
      if (!host || !opts?.series || !opts.chart) {
        return;
      }
      void this.render(opts);
    });
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private async render(opts: ChartOptions): Promise<void> {
    const generation = ++this.renderGeneration;
    const { default: ApexCharts } = await import('apexcharts');
    if (generation !== this.renderGeneration) {
      return;
    }

    const element = this.host()?.nativeElement;
    if (!element) {
      return;
    }

    this.destroyChart();
    this.chart = new ApexCharts(element, this.toApexOptions(opts));
    await this.chart.render();
  }

  private toApexOptions(opts: ChartOptions): ApexOptions {
    const apex: Record<string, unknown> = {};

    for (const key of APEX_OPTION_KEYS) {
      const value = opts[key];
      if (value === undefined || value === null) {
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }
      apex[key] = value;
    }

    const chart = { ...(apex['chart'] as Record<string, unknown> | undefined) };
    if (!chart['width']) {
      chart['width'] = '100%';
    }
    apex['chart'] = chart;

    return apex as ApexOptions;
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
