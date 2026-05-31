import { HttpErrorResponse } from '@angular/common/http';
import {
  ApiErrorCode,
  ApiErrorCodeType,
  API_ERROR_MESSAGE_MAX_LENGTH,
  API_ERROR_MESSAGES,
  API_ERROR_TITLES,
  isApiErrorCode,
} from '../constants';
import { ApiErrorResponse, ResolvedApiError } from '../models/api-response.model';
import { toSpanishUserMessage } from './error-message-locale';

export function shortenApiMessage(text: string, max = API_ERROR_MESSAGE_MAX_LENGTH): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

export function messageForCode(code: ApiErrorCodeType): string {
  return API_ERROR_MESSAGES[code];
}

export function titleForCode(code: ApiErrorCodeType): string {
  return API_ERROR_TITLES[code];
}

export function resolvedError(code: ApiErrorCodeType, message?: string): ResolvedApiError {
  const text = message
    ? shortenApiMessage(toSpanishUserMessage(message, code))
    : messageForCode(code);
  return {
    code,
    title: titleForCode(code),
    message: text,
  };
}

function readStringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function extractApiDetail(record: Record<string, unknown>): string {
  return (
    readStringField(record, 'message') ||
    readStringField(record, 'detail') ||
    readStringField(record, 'error') ||
    readStringField(record, 'title')
  );
}

export function parseApiErrorBody(body: unknown): ApiErrorResponse | null {
  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (!trimmed) {
      return null;
    }
    try {
      return parseApiErrorBody(JSON.parse(trimmed) as unknown);
    } catch {
      return { code: '', message: trimmed };
    }
  }

  if (typeof body !== 'object') {
    return null;
  }

  const record = body as Record<string, unknown>;
  const code = readStringField(record, 'code');
  const message = extractApiDetail(record);

  if (!code && !message) {
    return null;
  }

  return {
    code,
    message,
    error: readStringField(record, 'error') || undefined,
    timestamp: readStringField(record, 'timestamp') || undefined,
  };
}

export function resolveFromApiBody(body: ApiErrorResponse): ResolvedApiError {
  const detail = body.message?.trim() || body.error?.trim() || '';

  if (isApiErrorCode(body.code)) {
    const message = shortenApiMessage(toSpanishUserMessage(detail, body.code));
    return resolvedError(body.code, message);
  }

  if (detail) {
    const message = shortenApiMessage(toSpanishUserMessage(detail));
    return resolvedError(ApiErrorCode.UNKNOWN_ERROR, message);
  }

  return resolvedError(ApiErrorCode.UNKNOWN_ERROR);
}

export function resolveHttpStatus(status: number): ResolvedApiError {
  switch (status) {
    case 0:
      return resolvedError(ApiErrorCode.NETWORK_ERROR);
    case 401:
      return resolvedError(ApiErrorCode.AUTH_INVALID_CREDENTIALS);
    case 403:
      return resolvedError(ApiErrorCode.AUTH_ACCESS_DENIED);
    case 413:
      return resolvedError(ApiErrorCode.FILE_TOO_LARGE);
    case 400:
      return resolvedError(ApiErrorCode.VALIDATION_ERROR);
    case 500:
    case 502:
    case 503:
      return resolvedError(ApiErrorCode.SERVER_ERROR);
    default:
      return resolvedError(ApiErrorCode.UNKNOWN_ERROR);
  }
}

export function resolveApiError(err: unknown): ResolvedApiError {
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    'title' in err
  ) {
    return err as ResolvedApiError;
  }

  if (typeof err === 'object' && err !== null && 'code' in err && 'message' in err) {
    return resolveFromApiBody(err as ApiErrorResponse);
  }

  if (err instanceof HttpErrorResponse) {
    const parsed = parseApiErrorBody(err.error);
    if (parsed) {
      return resolveFromApiBody(parsed);
    }
    if (err.message?.trim()) {
      const fromStatus = resolveHttpStatus(err.status);
      const localized = toSpanishUserMessage(err.message, fromStatus.code);
      if (localized !== err.message.trim()) {
        return resolvedError(fromStatus.code, localized);
      }
    }
    return resolveHttpStatus(err.status);
  }

  if (typeof err === 'string' && err.trim()) {
    const message = shortenApiMessage(toSpanishUserMessage(err));
    return resolvedError(ApiErrorCode.UNKNOWN_ERROR, message);
  }

  return resolvedError(ApiErrorCode.UNKNOWN_ERROR);
}

/** Validación local del formulario de login (antes de llamar al API). */
export function validateLoginForm(username: string, password: string): ResolvedApiError | null {
  const user = username.trim();
  const pass = password;

  if (!user && !pass) {
    return resolvedError(ApiErrorCode.AUTH_FIELDS_REQUIRED);
  }
  if (!user) {
    return resolvedError(ApiErrorCode.AUTH_USERNAME_REQUIRED);
  }
  if (!pass) {
    return resolvedError(ApiErrorCode.AUTH_PASSWORD_REQUIRED);
  }

  return null;
}
