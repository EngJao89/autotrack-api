import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { FIREBASE_TOKEN_VERIFIER } from '../../auth/auth.constants';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user';
import type { FirebaseTokenVerifier } from '../../auth/interfaces/firebase-token-verifier';
import { UsersService } from '../../users/users.service';
import {
  LOCAL_USER_ID_HEADER,
  REQUEST_USER_ID_KEY,
} from './user-context.constants';

type UserContextRequest = Request & {
  [REQUEST_USER_ID_KEY]?: string;
  user?: AuthenticatedUser;
};

/**
 * Resolves the acting local user id for ownership checks.
 *
 * Priority:
 * 1. `Authorization: Bearer <firebase-id-token>` → verify → lookup by `firebaseUid`
 * 2. Local adapter `X-User-Id` (disabled in production)
 */
@Injectable()
export class UserContextGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Optional()
    @Inject(FIREBASE_TOKEN_VERIFIER)
    private readonly tokenVerifier?: FirebaseTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<UserContextRequest>();
    const bearer = this.extractBearerToken(request.headers.authorization);

    if (bearer && this.tokenVerifier) {
      const authUser = await this.tokenVerifier.verifyIdToken(bearer);
      const localUser = await this.usersService.findByFirebaseUidOrThrow(
        authUser.firebaseUid,
      );
      request.user = authUser;
      request[REQUEST_USER_ID_KEY] = localUser.id;
      return true;
    }

    if (!this.isLocalUserIdAdapterEnabled()) {
      throw new UnauthorizedException(
        bearer
          ? 'Authentication token verifier is not available'
          : 'Authentication token is required',
      );
    }

    const rawHeader = request.headers[LOCAL_USER_ID_HEADER];
    const userId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!userId?.trim()) {
      throw new UnauthorizedException(
        'X-User-Id header is required for local development (or send Bearer token)',
      );
    }

    const user = await this.usersService.findById(userId.trim());
    request[REQUEST_USER_ID_KEY] = user.id;
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

  private isLocalUserIdAdapterEnabled(): boolean {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      return false;
    }

    const flag = this.configService
      .get<string>('LOCAL_USER_ID_HEADER_ENABLED')
      ?.toLowerCase();

    if (flag === 'false') {
      return false;
    }

    return true;
  }
}
