import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest } from '../models/auth.model';
import { CreateUsuarioRequest, UpdateUsuarioRequest, UsuarioSummary } from '../models/user.model';
import { ImportResult } from '../models/rgfm.model';
import { ViewSettings } from '../models/view-settings.model';
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

  importExcel(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<ImportResult>(`${this.baseUrl}/import`, formData)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }

  saveImport(payload: {
    sourceFileName: string;
    headersFound: string[];
    rows: Record<string, string>[];
  }): Observable<SaveImportResult> {
    return this.http
      .post<SaveImportResult>(`${this.baseUrl}/save-import`, payload)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
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
export class UserAdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/users`;

  listUsers(): Observable<UsuarioSummary[]> {
    return this.http
      .get<UsuarioSummary[]>(this.baseUrl)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }

  createUser(payload: CreateUsuarioRequest): Observable<UsuarioSummary> {
    return this.http
      .post<UsuarioSummary>(this.baseUrl, payload)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }

  updateUser(id: number, payload: UpdateUsuarioRequest): Observable<UsuarioSummary> {
    return this.http
      .put<UsuarioSummary>(`${this.baseUrl}/${id}`, payload)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }

  deleteUser(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }
}

@Injectable({ providedIn: 'root' })
export class ViewSettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/view-settings`;

  getSettings(): Observable<ViewSettings> {
    return this.http
      .get<ViewSettings>(this.baseUrl)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }

  saveSettings(payload: ViewSettings): Observable<ViewSettings> {
    return this.http
      .put<ViewSettings>(this.baseUrl, payload)
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
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

@Injectable({ providedIn: 'root' })
export class PresenceApiService {
  private readonly http = inject(HttpClient);

  ping(): Observable<{ ok: boolean }> {
    return this.http
      .post<{ ok: boolean }>(`${environment.apiUrl}/api/presence/ping`, {})
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }

  offline(): Observable<{ ok: boolean }> {
    return this.http
      .post<{ ok: boolean }>(`${environment.apiUrl}/api/presence/offline`, {})
      .pipe(catchError((err) => throwError(() => mapHttpError(err))));
  }
}
