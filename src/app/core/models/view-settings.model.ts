import type { ChartAggregation } from './chart.model';

export interface ReportsViewSettings {
  columnOrder: string[];
  hiddenColumns: string[];
}

export interface ChartsViewSettings {
  categoryColumn: string;
  valueColumn?: string;
  aggregation: ChartAggregation;
  title: string;
  topN: number;
  expandedPanels: string[];
}

export interface ViewSettings {
  revision: number;
  reports: ReportsViewSettings;
  charts: ChartsViewSettings | null;
}

export const EMPTY_VIEW_SETTINGS: ViewSettings = {
  revision: 0,
  reports: { columnOrder: [], hiddenColumns: [] },
  charts: null,
};
