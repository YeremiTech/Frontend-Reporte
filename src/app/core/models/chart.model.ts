import type { ApexOptions } from 'apexcharts';

export type ChartKind = 'bar' | 'donut' | 'radialBar' | 'line';

export type ChartAggregation = 'sum' | 'count' | 'avg';

export interface ChartBuildConfig {
  kind: ChartKind;
  categoryColumn: string;
  valueColumn?: string;
  aggregation: ChartAggregation;
  title?: string;
  topN?: number;
}

export interface ColumnMeta {
  name: string;
  role: 'numeric' | 'category' | 'mixed';
  numericRatio: number;
  distinctCount: number;
}

export type ChartOptions = ApexOptions;

export interface ReportDatasetSnapshot {
  rows: Record<string, string>[];
  columns: string[];
}
