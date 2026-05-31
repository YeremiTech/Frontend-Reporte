import { Injectable, computed, inject, signal } from '@angular/core';

import { firstValueFrom } from 'rxjs';

import type { ReportDatasetSnapshot } from '../models/chart.model';

import { rgfmRecordsToImportRows } from '../models/rgfm.model';

import { RgfmApiService } from './rgfm-api.service';



@Injectable({ providedIn: 'root' })

export class ReportDataStoreService {

  private readonly api = inject(RgfmApiService);



  private readonly rowsSignal = signal<Record<string, string>[]>([]);

  private readonly columnsSignal = signal<string[]>([]);

  private readonly loadingSignal = signal(false);



  private refreshPromise: Promise<void> | null = null;



  readonly loading = this.loadingSignal.asReadonly();



  readonly hasData = computed(() => this.rowsSignal().length > 0);



  readonly snapshot = computed((): ReportDatasetSnapshot | null => {

    if (!this.hasData()) {

      return null;

    }

    return {

      rows: this.rowsSignal(),

      columns: this.columnsSignal(),

    };

  });



  clear(): void {

    this.rowsSignal.set([]);

    this.columnsSignal.set([]);

  }



  /** Carga datos persistidos en BD (lazy). No usa filas de preview/importación. */

  refreshFromDatabase(options: { force?: boolean } = {}): Promise<void> {

    if (!options.force && this.hasData()) {

      return Promise.resolve();

    }



    if (this.refreshPromise) {

      return this.refreshPromise;

    }



    this.refreshPromise = this.loadFromDatabase().finally(() => {

      this.refreshPromise = null;

    });



    return this.refreshPromise;

  }



  private setDataset(rows: Record<string, string>[], columns: string[]): void {

    this.rowsSignal.set([...rows]);

    this.columnsSignal.set([...columns]);

  }



  private async loadFromDatabase(): Promise<void> {

    this.loadingSignal.set(true);

    try {

      const probe = await firstValueFrom(this.api.listRecords({ page: 0, size: 1 }));

      const total = probe.total ?? 0;

      if (total === 0) {

        this.clear();

        return;

      }



      const [page, headersResponse] = await Promise.all([

        firstValueFrom(this.api.listRecords({ page: 0, size: total })),

        firstValueFrom(this.api.getHeaders()),

      ]);



      const headers = headersResponse.expectedHeaders ?? [];

      const rows = rgfmRecordsToImportRows(page.data ?? [], headers);

      this.setDataset(rows, headers);

    } catch {

      this.clear();

    } finally {

      this.loadingSignal.set(false);

    }

  }

}

