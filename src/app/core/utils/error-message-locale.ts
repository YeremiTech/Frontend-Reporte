import { ApiErrorCode, ApiErrorCodeType } from '../constants/api-response.codes';
import { API_ERROR_MESSAGES } from '../constants/api-response.messages';

function messageForCode(code: ApiErrorCodeType): string {
  return API_ERROR_MESSAGES[code];
}

function isLikelySpanish(text: string): boolean {
  const t = text.trim();
  if (!t) {
    return false;
  }
  if (/[áéíóúñÁÉÍÓÚÑ¿¡]/.test(t)) {
    return true;
  }
  return /\b(no se|ingrese|revise|archivo|excel|contraseña|usuario|datos|filas|columnas|vendedor|seleccione|compruebe|verifique|importar|exportar)\b/i.test(
    t
  );
}

export function toSpanishUserMessage(detail: string, code?: ApiErrorCodeType): string {
  const trimmed = detail.trim();

  if (!trimmed) {
    return code ? messageForCode(code) : messageForCode(ApiErrorCode.UNKNOWN_ERROR);
  }

  if (isLikelySpanish(trimmed)) {
    return trimmed;
  }

  return code ? messageForCode(code) : messageForCode(ApiErrorCode.UNKNOWN_ERROR);
}
