import { ApiErrorCodeType } from '../constants/api-response.codes';

/** Cuerpo de error estándar del backend. */
export interface ApiErrorResponse {
  code: ApiErrorCodeType | string;
  message: string;
  /** Detalle técnico opcional (no mostrar tal cual en UI). */
  error?: string;
  timestamp?: string;
}

export interface ResolvedApiError {
  code: ApiErrorCodeType;
  title: string;
  message: string;
}
