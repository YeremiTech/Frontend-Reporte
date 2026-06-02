import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, catchError, map, switchMap, tap } from 'rxjs';
import { RgfmApiService, type RgfmDataset, type RgfmDatasetMeta } from './api.service';
import { AppViewSettingsService } from './app-view-settings.service';
import { AuthService } from './auth.service';
import { ReportDataStoreService } from './report-data-store.service';
import { uniqueImportHeaders } from '../models/rgfm.model';

@Injectable({ providedIn: 'root' })
export class ReportDataSyncService {
  private readonly rgfmApi = inject(RgfmApiService);
  private readonly store = inject(ReportDataStoreService);
  private readonly viewSettings = inject(AppViewSettingsService);
  private readonly auth = inject(AuthService);

  private lastFingerprint = '';
  private reloadInFlight = false;

  /** Polls lightweight dataset meta; reloads full dataset when admin saved a new import. */
  refreshIfChanged(): Observable<void> {
    if (!this.auth.isAuthenticated() || this.store.hasPendingSave()) {
      return EMPTY;
    }

    return this.rgfmApi.loadDatasetMeta().pipe(
      switchMap((meta) => {
        const fingerprint = this.buildFingerprint(meta);

        if (this.lastFingerprint === '') {
          this.lastFingerprint = fingerprint;
          if (this.shouldLoadOnFirstPoll(meta)) {
            return this.reloadFullDataset(fingerprint);
          }
          return EMPTY;
        }

        if (fingerprint === this.lastFingerprint || this.reloadInFlight) {
          return EMPTY;
        }

        return this.reloadFullDataset(fingerprint);
      }),
      catchError(() => EMPTY)
    );
  }

  resetFingerprint(): void {
    this.lastFingerprint = '';
  }

  /** Tras guardar importación en BD (misma sesión del admin). */
  noteLocalSave(): void {
    this.rgfmApi.loadDatasetMeta().subscribe({
      next: (meta) => {
        this.lastFingerprint = this.buildFingerprint(meta);
      },
    });
  }

  private shouldLoadOnFirstPoll(meta: RgfmDatasetMeta): boolean {
    if (meta.total === 0) {
      return false;
    }
    const localRows = this.store.persistedSnapshot()?.rows.length ?? 0;
    return localRows === 0 || localRows !== meta.total;
  }

  private reloadFullDataset(fingerprint: string): Observable<void> {
    this.reloadInFlight = true;

    return this.rgfmApi.loadDataset().pipe(
      tap({
        next: (dataset) => {
          this.lastFingerprint = fingerprint;
          this.applyDataset(dataset);
          this.reloadInFlight = false;
        },
        error: () => {
          this.reloadInFlight = false;
        },
      }),
      map(() => void 0),
      catchError(() => EMPTY)
    );
  }

  private applyDataset(dataset: RgfmDataset): void {
    if (dataset.total === 0 || dataset.rows.length === 0) {
      if (this.store.hasPersistedData()) {
        this.store.clear();
      }
      return;
    }

    const headers = uniqueImportHeaders(dataset.headers);
    const layout = this.viewSettings.buildReportsLayoutFromHeaders(headers);

    this.store.loadPersisted({
      rows: dataset.rows,
      columns: layout.order,
      sourceFileName: dataset.sourceFileName,
      columnOrder: layout.order,
      hiddenColumns: [...layout.hidden],
    });
  }

  private buildFingerprint(meta: RgfmDatasetMeta): string {
    return `${meta.importedAt ?? ''}|${meta.total}|${meta.sourceFileName ?? ''}`;
  }
}
