export const API_ERROR_CODE = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODE)[keyof typeof API_ERROR_CODE];

export function defaultErrorCodeForStatus(statusCode: number): ApiErrorCode {
  switch (statusCode) {
    case 400:
      return API_ERROR_CODE.BAD_REQUEST;
    case 401:
      return API_ERROR_CODE.UNAUTHORIZED;
    case 403:
      return API_ERROR_CODE.FORBIDDEN;
    case 404:
      return API_ERROR_CODE.NOT_FOUND;
    case 409:
      return API_ERROR_CODE.CONFLICT;
    default:
      return statusCode >= 500
        ? API_ERROR_CODE.INTERNAL_ERROR
        : API_ERROR_CODE.BAD_REQUEST;
  }
}
