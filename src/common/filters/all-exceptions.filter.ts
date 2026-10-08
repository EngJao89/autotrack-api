import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiErrorBody, ApiFieldError } from '../errors/api-error';
import {
  API_ERROR_CODE,
  defaultErrorCodeForStatus,
} from '../errors/error-codes';
import { RequestWithId } from '../middleware/request-id.middleware';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId ?? randomUUID();

    const body = this.toErrorBody(exception, requestId);

    if (body.statusCode >= 500) {
      this.logger.error(
        {
          requestId,
          path: request.url,
          method: request.method,
          error:
            exception instanceof Error
              ? { name: exception.name, message: exception.message }
              : 'Unknown error',
        },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown, requestId: string): ApiErrorBody {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception, requestId);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: API_ERROR_CODE.INTERNAL_ERROR,
      message: 'Internal server error',
      requestId,
    };
  }

  private fromHttpException(
    exception: HttpException,
    requestId: string,
  ): ApiErrorBody {
    const statusCode = exception.getStatus();
    const raw = exception.getResponse();

    if (typeof raw === 'string') {
      return {
        statusCode,
        code: defaultErrorCodeForStatus(statusCode),
        message: raw,
        requestId,
      };
    }

    const payload = raw as Record<string, unknown>;
    const code =
      typeof payload.code === 'string'
        ? payload.code
        : defaultErrorCodeForStatus(statusCode);
    const message = this.extractMessage(payload, statusCode);
    const errors = this.extractFieldErrors(payload);

    return {
      statusCode,
      code,
      message,
      ...(errors ? { errors } : {}),
      requestId,
    };
  }

  private extractMessage(
    payload: Record<string, unknown>,
    statusCode: number,
  ): string {
    if (typeof payload.message === 'string') {
      return payload.message;
    }

    if (Array.isArray(payload.message)) {
      return 'Request validation failed';
    }

    if (statusCode >= 500) {
      return 'Internal server error';
    }

    return defaultErrorCodeForStatus(statusCode);
  }

  private extractFieldErrors(
    payload: Record<string, unknown>,
  ): ApiFieldError[] | undefined {
    if (!Array.isArray(payload.errors)) {
      return undefined;
    }

    const errors = payload.errors.filter(
      (item): item is ApiFieldError =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ApiFieldError).field === 'string' &&
        Array.isArray((item as ApiFieldError).messages),
    );

    return errors.length > 0 ? errors : undefined;
  }
}
