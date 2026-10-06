import { UnauthorizedException } from '@nestjs/common';
import { AuthErrorCode } from '../auth.constants';

export class AuthUnauthorizedException extends UnauthorizedException {
  constructor(code: AuthErrorCode, message: string) {
    super({
      statusCode: 401,
      code,
      message,
    });
  }
}
