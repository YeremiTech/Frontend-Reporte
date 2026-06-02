import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorCode } from '../constants';
import { ResolvedApiError } from '../models/api-response.model';
import { resolvedError } from './api-error.resolver';

interface ApiErrorBody {
  code?: string;
  message?: string;
}

export function mapHttpError(error: unknown): ResolvedApiError {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return resolvedError(
        ApiErrorCode.UNKNOWN_ERROR,
        'Sin conexión con el servidor.'
      );
    }

    const body = error.error as ApiErrorBody | null;
    if (body?.code && isKnownErrorCode(body.code)) {
      return resolvedError(body.code, body.message);
    }

    if (error.status >= 500) {
      return resolvedError(
        ApiErrorCode.UNKNOWN_ERROR,
        'Error interno del servidor. Intente más tarde.'
      );
    }
  }

  return resolvedError(ApiErrorCode.UNKNOWN_ERROR);
}

function isKnownErrorCode(code: string): code is (typeof ApiErrorCode)[keyof typeof ApiErrorCode] {
  return Object.values(ApiErrorCode).includes(code as (typeof ApiErrorCode)[keyof typeof ApiErrorCode]);
}
