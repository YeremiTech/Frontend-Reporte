import { ApiErrorCode, ApiErrorCodeType } from './api-response.codes';

export const API_ERROR_MESSAGES: Record<ApiErrorCodeType, string> = {
  [ApiErrorCode.AUTH_INVALID_CREDENTIALS]: 'Usuario o contraseña incorrectos.',
  [ApiErrorCode.AUTH_USERNAME_REQUIRED]: 'Ingrese usuario.',
  [ApiErrorCode.AUTH_PASSWORD_REQUIRED]: 'Ingrese su contraseña.',
  [ApiErrorCode.AUTH_FIELDS_REQUIRED]: 'Complete usuario y contraseña.',
  [ApiErrorCode.VALIDATION_ERROR]: 'Revise los datos ingresados.',
  [ApiErrorCode.EXCEL_IMPORT_ERROR]: 'No se pudo importar el Excel.',
  [ApiErrorCode.EXCEL_EXPORT_EMPTY]: 'No hay datos para exportar.',
  [ApiErrorCode.UNKNOWN_ERROR]: 'Ocurrió un error inesperado.',
};

export const API_ERROR_TITLES: Record<ApiErrorCodeType, string> = {
  [ApiErrorCode.AUTH_INVALID_CREDENTIALS]: 'Acceso denegado',
  [ApiErrorCode.AUTH_USERNAME_REQUIRED]: 'Datos incompletos',
  [ApiErrorCode.AUTH_PASSWORD_REQUIRED]: 'Datos incompletos',
  [ApiErrorCode.AUTH_FIELDS_REQUIRED]: 'Datos incompletos',
  [ApiErrorCode.VALIDATION_ERROR]: 'Validación',
  [ApiErrorCode.EXCEL_IMPORT_ERROR]: 'Importación',
  [ApiErrorCode.EXCEL_EXPORT_EMPTY]: 'Exportación',
  [ApiErrorCode.UNKNOWN_ERROR]: 'Error',
};

export const API_ERROR_MESSAGE_MAX_LENGTH = 120;
