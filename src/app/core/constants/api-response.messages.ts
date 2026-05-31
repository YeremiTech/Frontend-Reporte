import { ApiErrorCode, ApiErrorCodeType } from './api-response.codes';

/** Mensajes cortos para alertas (máx. claridad en UI). */
export const API_ERROR_MESSAGES: Record<ApiErrorCodeType, string> = {
  [ApiErrorCode.AUTH_INVALID_CREDENTIALS]: 'Usuario o contraseña incorrectos.',
  [ApiErrorCode.AUTH_ACCESS_DENIED]: 'No tiene permiso para realizar esta acción.',
  [ApiErrorCode.AUTH_USERNAME_REQUIRED]: 'Ingrese usuario o correo.',
  [ApiErrorCode.AUTH_PASSWORD_REQUIRED]: 'Ingrese su contraseña.',
  [ApiErrorCode.AUTH_FIELDS_REQUIRED]: 'Complete usuario o correo y contraseña.',
  [ApiErrorCode.VALIDATION_ERROR]: 'Revise los datos enviados.',
  [ApiErrorCode.EXCEL_IMPORT_ERROR]: 'No se pudo importar el Excel.',
  [ApiErrorCode.EXCEL_EXPORT_EMPTY]: 'No hay datos para exportar.',
  [ApiErrorCode.FILE_TOO_LARGE]: 'El archivo supera el tamaño permitido.',
  [ApiErrorCode.NETWORK_ERROR]: 'Sin conexión con el servidor.',
  [ApiErrorCode.SERVER_ERROR]: 'Error interno. Intente más tarde.',
  [ApiErrorCode.UNKNOWN_ERROR]: 'Ocurrió un error inesperado.',
};

/** Títulos de alerta por código. */
export const API_ERROR_TITLES: Record<ApiErrorCodeType, string> = {
  [ApiErrorCode.AUTH_INVALID_CREDENTIALS]: 'Acceso denegado',
  [ApiErrorCode.AUTH_ACCESS_DENIED]: 'Sin permiso',
  [ApiErrorCode.AUTH_USERNAME_REQUIRED]: 'Datos incompletos',
  [ApiErrorCode.AUTH_PASSWORD_REQUIRED]: 'Datos incompletos',
  [ApiErrorCode.AUTH_FIELDS_REQUIRED]: 'Datos incompletos',
  [ApiErrorCode.VALIDATION_ERROR]: 'Validación',
  [ApiErrorCode.EXCEL_IMPORT_ERROR]: 'Importación',
  [ApiErrorCode.EXCEL_EXPORT_EMPTY]: 'Exportación',
  [ApiErrorCode.FILE_TOO_LARGE]: 'Archivo',
  [ApiErrorCode.NETWORK_ERROR]: 'Conexión',
  [ApiErrorCode.SERVER_ERROR]: 'Servidor',
  [ApiErrorCode.UNKNOWN_ERROR]: 'Error',
};

export const API_ERROR_MESSAGE_MAX_LENGTH = 120;
