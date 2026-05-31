import { ApiErrorCode } from '../constants/api-response.codes';
import { ResolvedApiError } from '../models/api-response.model';
import { resolvedError } from './api-error.resolver';

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];

export function validateImportFile(file: File | undefined | null): ResolvedApiError | null {
  if (!file) {
    return resolvedError(ApiErrorCode.EXCEL_IMPORT_ERROR, 'Seleccione un archivo Excel.');
  }

  if (file.size === 0) {
    return resolvedError(ApiErrorCode.EXCEL_IMPORT_ERROR, 'El archivo está vacío.');
  }

  const name = file.name.toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!hasValidExtension) {
    return resolvedError(
      ApiErrorCode.EXCEL_IMPORT_ERROR,
      'Formato no compatible. Use Excel (.xlsx o .xls).'
    );
  }

  return null;
}
