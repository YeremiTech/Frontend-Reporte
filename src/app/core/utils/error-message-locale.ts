import { ApiErrorCode, ApiErrorCodeType } from '../constants/api-response.codes';
import { API_ERROR_MESSAGES } from '../constants/api-response.messages';

function messageForCode(code: ApiErrorCodeType): string {
  return API_ERROR_MESSAGES[code];
}

/** Indicios de texto pensado para el usuario en español. */
export function isLikelySpanish(text: string): boolean {
  const t = text.trim();
  if (!t) {
    return false;
  }
  if (/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t)) {
    return true;
  }
  return /\b(no se|ingrese|revise|archivo|excel|contraseña|usuario|datos|filas|columnas|vendedor|seleccione|compruebe|verifique|guardar|importar|exportar|base de datos)\b/i.test(
    t
  );
}

/** Mensajes técnicos en inglés (Spring, Angular, HTTP, JDBC). */
export function isLikelyEnglish(text: string): boolean {
  const t = text.trim();
  if (!t) {
    return false;
  }
  if (isLikelySpanish(t)) {
    return false;
  }
  if (/^Http failure response\b/i.test(t)) {
    return true;
  }
  if (/^(GET|POST|PUT|DELETE|PATCH)\s+/i.test(t)) {
    return true;
  }
  return /\b(unauthorized|forbidden|access denied|bad request|not found|internal server error|failed to|invalid|must not|required|cannot|connection refused|timeout|unknown error|unexpected error)\b/i.test(
    t
  );
}

const ENGLISH_PHRASE_TO_ES: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  { pattern: /unauthorized|full authentication is required/i, message: 'Sesión no válida o expirada. Vuelva a iniciar sesión.' },
  { pattern: /forbidden|access denied/i, message: 'No tiene permiso para realizar esta acción.' },
  { pattern: /bad request|failed to read request/i, message: 'Solicitud incorrecta. Revise los datos enviados.' },
  { pattern: /not found/i, message: 'Recurso no encontrado.' },
  { pattern: /internal server error|unexpected error/i, message: 'Error interno. Intente más tarde.' },
  { pattern: /connection refused/i, message: 'No se pudo conectar al servidor. Verifique que el backend esté activo.' },
  { pattern: /timeout|timed out/i, message: 'Tiempo de espera agotado. Intente de nuevo.' },
  { pattern: /payload too large|request entity too large/i, message: 'El archivo supera el tamaño permitido.' },
  { pattern: /^Http failure response\b/i, message: '' },
];

/**
 * Devuelve un mensaje en español para mostrar en alertas.
 * Si el detalle del API ya está en español, se conserva; si no, se usa el catálogo o traducción.
 */
export function toSpanishUserMessage(detail: string, code?: ApiErrorCodeType): string {
  const trimmed = detail.trim();

  if (!trimmed) {
    return code ? messageForCode(code) : messageForCode(ApiErrorCode.UNKNOWN_ERROR);
  }

  for (const { pattern, message } of ENGLISH_PHRASE_TO_ES) {
    if (pattern.test(trimmed)) {
      if (message) {
        return message;
      }
      break;
    }
  }

  if (isLikelyEnglish(trimmed)) {
    return code ? messageForCode(code) : messageForCode(ApiErrorCode.UNKNOWN_ERROR);
  }

  return trimmed;
}
