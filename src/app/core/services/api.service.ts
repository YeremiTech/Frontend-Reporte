import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.model';
import { ImportResult } from '../models/rgfm.model';
import { mapHttpError } from '../utils/http-error.mapper';

export interface RgfmDataset {
  headers: string[];
  rows: Record<string, string>[];
  sourceFileName: string;
  total: number;
}

export interface SaveImportResult {
  rowsSaved: number;
  message: string;
  sourceFileName: string;
  headersPersisted: string[];
  dynamicColumnsAdded: number;
}

export interface RgfmFilters {
  meses: string[];
  vendedores: string[];
}

@Injectable({ providedIn: 'root' })
export class RgfmApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/rgfm`;

  loadDataset(): Observable<RgfmDataset> {
    return this.http
      .get<RgfmDataset>(`${this.baseUrl}/dataset`)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }

  loadFilters(): Observable<RgfmFilters> {
    return this.http
      .get<RgfmFilters>(`${this.baseUrl}/filters`)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }

  importAndSave(file: File): Observable<SaveImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportResult>(`${this.baseUrl}/import`, formData).pipe(
      switchMap((importResult) =>
        this.http.post<SaveImportResult>(`${this.baseUrl}/save-import`, {
          sourceFileName: file.name,
          headersFound: importResult.headersFound,
          rows: importResult.rows,
        })
      ),
      catchError((err) => throwError(() => mapHttpError(err)))
    );
  }

  exportExcel(columns: string[], mes?: string, vendedor?: string): Observable<{ blob: Blob; filename: string }> {
    const params = new URLSearchParams();
    if (columns.length > 0) {
      params.set('columns', columns.join(','));
    }
    if (mes) {
      params.set('mes', mes);
    }
    if (vendedor) {
      params.set('vendedor', vendedor);
    }

    const query = params.toString();
    const url = query ? `${this.baseUrl}/export?${query}` : `${this.baseUrl}/export`;

    return this.http.get(url, { responseType: 'blob', observe: 'response' }).pipe(
      map((response) => {
        const disposition = response.headers.get('Content-Disposition') ?? '';
        const filenameMatch = disposition.match(/filename="([^"]+)"/);
        const filename = filenameMatch?.[1] ?? `RGFM_export_${Date.now()}.xlsx`;
        return { blob: response.body ?? new Blob(), filename };
      }),
      catchError((err) => throwError(() => mapHttpError(err)))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, credentials)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }
}
