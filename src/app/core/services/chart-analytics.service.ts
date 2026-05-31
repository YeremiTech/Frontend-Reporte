import { Injectable } from '@angular/core';
import type {
  AggregatedPoint,
  ChartBuildConfig,
  ChartOptions,
  ColumnMeta,
} from '../models/chart.model';
import { parseNumericCell } from '../utils/parse-numeric-cell';

const CHART_PALETTE = [
  '#008FFB',
  '#00E396',
  '#FEB019',
  '#FF4560',
  '#775DD0',
  '#546E7A',
  '#26a69a',
  '#D10CE8',
  '#FFAA49',
  '#33b2df',
];

const SAMPLE_LIMIT = 500;

@Injectable({ providedIn: 'root' })
export class ChartAnalyticsService {
  analyzeColumns(rows: Record<string, string>[], columns: string[]): ColumnMeta[] {
    const sample = rows.slice(0, SAMPLE_LIMIT);
    return columns.map((name) => this.analyzeColumn(name, sample));
  }

  suggestConfig(meta: ColumnMeta[]): Partial<ChartBuildConfig> {
    const categories = meta.filter((m) => m.role === 'category' || m.role === 'mixed');
    const numerics = meta.filter((m) => m.role === 'numeric');
    const categoryColumn =
      categories.sort((a, b) => a.distinctCount - b.distinctCount)[0]?.name ??
      meta[0]?.name;
    const valueColumn = numerics[0]?.name;
    return {
      kind: 'bar',
      categoryColumn,
      valueColumn,
      aggregation: valueColumn ? 'sum' : 'count',
      topN: 12,
    };
  }

  aggregate(
    rows: Record<string, string>[],
    config: Pick<ChartBuildConfig, 'categoryColumn' | 'valueColumn' | 'aggregation'>
  ): AggregatedPoint[] {
    const map = new Map<string, { sum: number; count: number }>();

    for (const row of rows) {
      const label = (row[config.categoryColumn] ?? '').trim() || '(vacío)';
      const bucket = map.get(label) ?? { sum: 0, count: 0 };
      bucket.count += 1;

      if (config.valueColumn) {
        const num = parseNumericCell(row[config.valueColumn]);
        if (num !== null) {
          bucket.sum += num;
        }
      } else if (config.aggregation !== 'count') {
        bucket.sum += 1;
      }

      map.set(label, bucket);
    }

    const points: AggregatedPoint[] = [];
    for (const [label, bucket] of map) {
      let value: number;
      switch (config.aggregation) {
        case 'avg':
          value = bucket.count > 0 ? bucket.sum / bucket.count : 0;
          break;
        case 'sum':
          value = config.valueColumn ? bucket.sum : bucket.count;
          break;
        default:
          value = bucket.count;
      }
      points.push({ label, value });
    }

    return points.sort((a, b) => b.value - a.value);
  }

  buildChartOptions(
    rows: Record<string, string>[],
    config: ChartBuildConfig,
    view: { compact?: boolean } = {}
  ): ChartOptions | null {
    const compact = view.compact ?? false;
    if (!config.categoryColumn || !rows.length) {
      return null;
    }

    const topN = config.topN ?? 12;
    const points = this.aggregate(rows, config).slice(0, topN);
    if (!points.length) {
      return null;
    }

    const labels = points.map((p) => p.label);
    const values = points.map((p) => p.value);
    const titleText =
      config.title?.trim() ||
      `${this.aggregationLabel(config.aggregation)} por ${config.categoryColumn}`;

    switch (config.kind) {
      case 'donut':
        return this.buildDonut(labels, values, titleText, compact);
      case 'radialBar':
        return this.buildRadialBar(labels, values, titleText, compact);
      case 'line':
        return this.buildLine(labels, values, titleText, compact);
      default:
        return this.buildBar(labels, values, titleText, compact);
    }
  }

  private analyzeColumn(name: string, rows: Record<string, string>[]): ColumnMeta {
    let numeric = 0;
    let nonEmpty = 0;
    const distinct = new Set<string>();

    for (const row of rows) {
      const raw = row[name];
      if (raw == null || String(raw).trim() === '') {
        continue;
      }
      nonEmpty += 1;
      distinct.add(String(raw).trim());
      if (parseNumericCell(raw) !== null) {
        numeric += 1;
      }
    }

    const numericRatio = nonEmpty > 0 ? numeric / nonEmpty : 0;
    let role: ColumnMeta['role'] = 'mixed';
    if (numericRatio >= 0.85) {
      role = 'numeric';
    } else if (numericRatio <= 0.15) {
      role = 'category';
    }

    return {
      name,
      role,
      numericRatio,
      distinctCount: distinct.size,
    };
  }

  private aggregationLabel(agg: ChartBuildConfig['aggregation']): string {
    switch (agg) {
      case 'avg':
        return 'Promedio';
      case 'sum':
        return 'Suma';
      default:
        return 'Conteo';
    }
  }

  private buildBar(labels: string[], values: number[], title: string, compact: boolean): ChartOptions {
    return {
      series: [{ data: values }],
      chart: {
        height: compact ? 240 : 360,
        type: 'bar',
        toolbar: { show: !compact },
      },
      colors: CHART_PALETTE,
      plotOptions: {
        bar: { columnWidth: '45%', distributed: true },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      title: { text: title, style: { fontSize: compact ? '12px' : '14px' } },
      xaxis: {
        categories: labels,
        labels: {
          rotate: compact ? -25 : -35,
          style: { colors: CHART_PALETTE, fontSize: compact ? '10px' : '11px' },
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { height: compact ? 220 : 300 },
            xaxis: { labels: { rotate: -25 } },
          },
        },
      ],
    };
  }

  private buildLine(labels: string[], values: number[], title: string, compact: boolean): ChartOptions {
    return {
      series: [{ name: title, data: values }],
      chart: {
        height: compact ? 240 : 360,
        type: 'line',
        toolbar: { show: !compact },
        zoom: { enabled: false },
      },
      colors: ['#FFAA49'],
      stroke: { curve: 'smooth', width: 3 },
      dataLabels: { enabled: false },
      title: { text: title, style: { fontSize: compact ? '12px' : '14px' } },
      xaxis: { categories: labels, labels: { rotate: compact ? -25 : -35 } },
      markers: { size: compact ? 3 : 4 },
    };
  }

  private buildDonut(labels: string[], values: number[], title: string, compact: boolean): ChartOptions {
    return {
      series: values,
      labels,
      chart: { width: '100%', height: compact ? 260 : 380, type: 'donut' },
      colors: CHART_PALETTE,
      plotOptions: {
        pie: { startAngle: -90, endAngle: 270 },
      },
      dataLabels: { enabled: true },
      fill: { type: 'gradient' },
      legend: {
        position: 'bottom',
        fontSize: compact ? '10px' : '12px',
        formatter: (val, opts) => {
          const idx = opts.seriesIndex;
          const num = opts.w.globals.series[idx];
          return `${val} — ${num}`;
        },
      },
      title: { text: title, style: { fontSize: compact ? '12px' : '14px' } },
      responsive: [
        {
          breakpoint: 480,
          options: {
            chart: { width: '100%' },
            legend: { position: 'bottom' },
          },
        },
      ],
    };
  }

  private buildRadialBar(
    labels: string[],
    values: number[],
    title: string,
    compact: boolean
  ): ChartOptions {
    const max = Math.max(...values, 1);
    const normalized = values.map((v) => Math.round((v / max) * 100));

    return {
      series: normalized,
      labels,
      chart: { height: compact ? 270 : 390, type: 'radialBar' },
      colors: CHART_PALETTE,
      plotOptions: {
        radialBar: {
          offsetY: 0,
          startAngle: 0,
          endAngle: 270,
          hollow: {
            margin: 5,
            size: '30%',
            background: 'transparent',
          },
          dataLabels: {
            name: { show: false },
            value: { show: false },
          },
          barLabels: {
            enabled: true,
            useSeriesColors: true,
            offsetX: -8,
            fontSize: compact ? '11px' : '14px',
            formatter: (seriesName, opts) => {
              const raw = values[opts.seriesIndex];
              return `${seriesName}: ${raw}`;
            },
          },
        },
      },
      title: { text: title, style: { fontSize: compact ? '12px' : '14px' } },
      responsive: [
        {
          breakpoint: 480,
          options: { legend: { show: false } },
        },
      ],
    };
  }
}
