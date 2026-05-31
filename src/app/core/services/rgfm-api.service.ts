import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { resolveApiError } from '../utils/api-error.resolver';
import {
  ImportResult,
  RgfmFiltersResponse,
  RgfmHeadersResponse,
  RgfmListResponse,
  RgfmQueryParams,
  SaveImportRequest,
  SaveImportResult,
} from '../models/rgfm.model';
import { ResolvedApiError } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class RgfmApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/rgfm`;

  getHeaders(): Observable<RgfmHeadersResponse> {
    return this.http
      .get<RgfmHeadersResponse>(`${this.baseUrl}/headers`)
      .pipe(catchError(this.handleError));
  }

  getFilters(): Observable<RgfmFiltersResponse> {
    return this.http
      .get<RgfmFiltersResponse>(`${this.baseUrl}/filters`)
      .pipe(catchError(this.handleError));
  }

  listRecords(params: RgfmQueryParams = {}): Observable<RgfmListResponse> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 0))
      .set('size', String(params.size ?? 10));

    if (params.mes) {
      httpParams = httpParams.set('mes', params.mes);
    }
    if (params.vendedor) {
      httpParams = httpParams.set('vendedor', params.vendedor);
    }

    return this.http
      .get<RgfmListResponse>(this.baseUrl, { params: httpParams })
      .pipe(catchError(this.handleError));
  }

  importExcel(file: File): Observable<ImportResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http
      .post<ImportResult>(`${this.baseUrl}/import`, formData)
      .pipe(catchError(this.handleError));
  }

  saveImport(request: SaveImportRequest): Observable<SaveImportResult> {
    return this.http
      .post<SaveImportResult>(`${this.baseUrl}/save-import`, request)
      .pipe(catchError(this.handleError));
  }

  exportExcel(columns?: string[], filters?: { mes?: string; vendedor?: string }): Observable<Blob> {
    let params = new HttpParams();

    if (columns && columns.length > 0) {
      params = params.set('columns', columns.join(','));
    }
    if (filters?.mes) {
      params = params.set('mes', filters.mes);
    }
    if (filters?.vendedor) {
      params = params.set('vendedor', filters.vendedor);
    }

    return this.http
      .get(`${this.baseUrl}/export`, { params, responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => resolveApiError(error));
  }
}

export async function parseHttpErrorFromBlob(error: HttpErrorResponse): Promise<ResolvedApiError> {
  if (!(error.error instanceof Blob)) {
    return resolveApiError(error);
  }

  try {
    const text = await error.error.text();
    const json = JSON.parse(text) as unknown;
    const { parseApiErrorBody, resolveFromApiBody } = await import('../utils/api-error.resolver');
    const parsed = parseApiErrorBody(json);
    if (parsed) {
      return resolveFromApiBody(parsed);
    }
  } catch {
    /* respuesta no JSON */
  }

  return resolveApiError(error);
}
