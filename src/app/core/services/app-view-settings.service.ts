import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, tap } from 'rxjs';
import type { ChartAggregation, ChartKind } from '../models/chart.model';
import {
  ChartsViewSettings,
  EMPTY_VIEW_SETTINGS,
  ReportsViewSettings,
  ViewSettings,
} from '../models/view-settings.model';
import { ViewSettingsApiService } from './api.service';
import { AuthService } from './auth.service';
import { ResolvedApiError } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AppViewSettingsService {
  private readonly api = inject(ViewSettingsApiService);
  private readonly auth = inject(AuthService);

  private readonly settingsState = signal<ViewSettings>(EMPTY_VIEW_SETTINGS);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private saveInFlight = false;
  private pendingSave = false;

  readonly settings = this.settingsState.asReadonly();
  readonly revision = () => this.settingsState().revision;

  load(): Observable<ViewSettings> {
    return this.api.getSettings().pipe(
      tap((settings) => this.applyServerSettings(settings)),
      catchError(() => EMPTY)
    );
  }

  refreshIfNewer(): Observable<ViewSettings> {
    const knownRevision = this.settingsState().revision;
    return this.api.getSettings().pipe(
      tap((settings) => {
        if (settings.revision !== knownRevision) {
          this.applyServerSettings(settings);
        }
      }),
      catchError(() => EMPTY)
    );
  }

  reportsLayout(): ReportsViewSettings {
    return this.settingsState().reports;
  }

  chartsLayout(): ChartsViewSettings | null {
    return this.settingsState().charts;
  }

  setReportsLayout(columnOrder: string[], hiddenColumns: Iterable<string>): void {
    const hidden = [...hiddenColumns];
    this.settingsState.update((current) => ({
      ...current,
      reports: {
        columnOrder: [...columnOrder],
        hiddenColumns: hidden,
      },
    }));

    if (this.auth.isAdmin()) {
      this.scheduleSave();
    }
  }

  setChartsLayout(layout: ChartsViewSettings): void {
    this.settingsState.update((current) => ({
      ...current,
      charts: { ...layout },
    }));

    if (this.auth.isAdmin()) {
      this.scheduleSave();
    }
  }

  buildReportsLayoutFromHeaders(headers: string[]): { order: string[]; hidden: Set<string> } {
    const saved = this.settingsState().reports;
    const order =
      saved.columnOrder.length > 0
        ? this.mergeColumnOrder(headers, saved.columnOrder)
        : [...headers];
    const hidden = new Set(
      saved.hiddenColumns.filter((header) => order.includes(header))
    );
    return { order, hidden };
  }

  private mergeColumnOrder(headers: string[], savedOrder: string[]): string[] {
    const headerSet = new Set(headers);
    const order = savedOrder.filter((header) => headerSet.has(header));
    for (const header of headers) {
      if (!order.includes(header)) {
        order.push(header);
      }
    }
    return order;
  }

  private applyServerSettings(settings: ViewSettings): void {
    this.settingsState.set({
      revision: settings.revision ?? 0,
      reports: {
        columnOrder: settings.reports?.columnOrder ?? [],
        hiddenColumns: settings.reports?.hiddenColumns ?? [],
      },
      charts: settings.charts
        ? {
            categoryColumn: settings.charts.categoryColumn ?? '',
            valueColumn: settings.charts.valueColumn || undefined,
            aggregation: (settings.charts.aggregation as ChartAggregation) ?? 'sum',
            title: settings.charts.title ?? '',
            topN: settings.charts.topN ?? 12,
            expandedPanels: settings.charts.expandedPanels ?? ['bar'],
          }
        : null,
    });
  }

  private scheduleSave(): void {
    if (!this.auth.isAdmin()) {
      return;
    }

    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.flushSave();
    }, 700);
  }

  private flushSave(): void {
    if (!this.auth.isAdmin()) {
      return;
    }

    if (this.saveInFlight) {
      this.pendingSave = true;
      return;
    }

    const payload = this.settingsState();
    this.saveInFlight = true;

    this.api.saveSettings(payload).subscribe({
      next: (saved) => {
        this.applyServerSettings(saved);
        this.saveInFlight = false;
        if (this.pendingSave) {
          this.pendingSave = false;
          this.flushSave();
        }
      },
      error: (err) => {
        this.saveInFlight = false;
        this.pendingSave = false;
        console.warn('No se pudo guardar la configuración de vistas.', err as ResolvedApiError);
      },
    });
  }
}
