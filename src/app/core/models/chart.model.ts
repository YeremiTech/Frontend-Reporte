import type {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexMarkers,
  ApexPlotOptions,
  ApexResponsive,
  ApexStroke,
  ApexTitleSubtitle,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';

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

export interface AggregatedPoint {
  label: string;
  value: number;
}

export type ChartOptions = {
  series?: ApexAxisChartSeries | ApexNonAxisChartSeries | number[];
  chart?: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis | ApexYAxis[];
  title?: ApexTitleSubtitle;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  fill?: ApexFill;
  legend?: ApexLegend;
  plotOptions?: ApexPlotOptions;
  responsive?: ApexResponsive[];
  colors?: string[];
  labels?: string[];
  markers?: ApexMarkers;
};

export interface ReportDatasetSnapshot {
  rows: Record<string, string>[];
  columns: string[];
  sourceLabel?: string;
  updatedAt: number;
}
