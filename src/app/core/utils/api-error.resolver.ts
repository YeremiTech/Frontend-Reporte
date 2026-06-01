import {
  ApiErrorCode,
  ApiErrorCodeType,
  API_ERROR_MESSAGE_MAX_LENGTH,
  API_ERROR_MESSAGES,
  API_ERROR_TITLES,
} from '../constants';
import { ResolvedApiError } from '../models/api-response.model';
import { toSpanishUserMessage } from './error-message-locale';

function shortenMessage(text: string, max = API_ERROR_MESSAGE_MAX_LENGTH): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

export function resolvedError(code: ApiErrorCodeType, message?: string): ResolvedApiError {
  const text = message
    ? shortenMessage(toSpanishUserMessage(message, code))
    : API_ERROR_MESSAGES[code];
  return {
    code,
    title: API_ERROR_TITLES[code],
    message: text,
  };
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

  if (typeof err === 'string' && err.trim()) {
    return resolvedError(ApiErrorCode.UNKNOWN_ERROR, err);
  }

  return resolvedError(ApiErrorCode.UNKNOWN_ERROR);
}

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
