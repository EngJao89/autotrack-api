import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { API_ERROR_CODE } from '../errors/error-codes';
import { flattenValidationErrors } from './flatten-validation-errors';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors: ValidationError[]) =>
      new BadRequestException({
        statusCode: 400,
        code: API_ERROR_CODE.VALIDATION_ERROR,
        message: 'Request validation failed',
        errors: flattenValidationErrors(errors),
      }),
  });
}
