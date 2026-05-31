/**
 * Códigos de error alineados con el backend (ApiErrorCode.java).
 */
export const ApiErrorCode = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_ACCESS_DENIED: 'AUTH_ACCESS_DENIED',
  AUTH_USERNAME_REQUIRED: 'AUTH_USERNAME_REQUIRED',
  AUTH_PASSWORD_REQUIRED: 'AUTH_PASSWORD_REQUIRED',
  AUTH_FIELDS_REQUIRED: 'AUTH_FIELDS_REQUIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  EXCEL_IMPORT_ERROR: 'EXCEL_IMPORT_ERROR',
  EXCEL_EXPORT_EMPTY: 'EXCEL_EXPORT_EMPTY',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ApiErrorCodeType = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

const API_ERROR_CODES: readonly ApiErrorCodeType[] = Object.values(ApiErrorCode);

export function isApiErrorCode(value: string): value is ApiErrorCodeType {
  return (API_ERROR_CODES as readonly string[]).includes(value);
}
