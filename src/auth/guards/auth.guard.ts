import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AUTH_ERROR_CODE, FIREBASE_TOKEN_VERIFIER } from '../auth.constants';
import { AuthUnauthorizedException } from '../exceptions/auth-unauthorized.exception';
import type { AuthenticatedUser } from '../interfaces/authenticated-user';
import type { FirebaseTokenVerifier } from '../interfaces/firebase-token-verifier';

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_TOKEN_VERIFIER)
    private readonly tokenVerifier: FirebaseTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new AuthUnauthorizedException(
        AUTH_ERROR_CODE.TOKEN_MISSING,
        'Authentication token is required',
      );
    }

    request.user = await this.tokenVerifier.verifyIdToken(token);
    return true;
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }

    return token.trim() || null;
  }
}
