export interface ApiFieldError {
  field: string;
  messages: string[];
}

export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  errors?: ApiFieldError[];
  requestId: string;
}
