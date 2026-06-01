import { ApiErrorCodeType } from '../constants/api-response.codes';

export interface ResolvedApiError {
  code: ApiErrorCodeType;
  title: string;
  message: string;
}
