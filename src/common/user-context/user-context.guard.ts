import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import {
  LOCAL_USER_ID_HEADER,
  REQUEST_USER_ID_KEY,
} from './user-context.constants';

type UserContextRequest = Request & {
  [REQUEST_USER_ID_KEY]?: string;
};

/**
 * Local development adapter for ATP-26.
 * Resolves the acting user from `X-User-Id` and is disabled in production.
 */
@Injectable()
export class UserContextGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.isLocalUserIdAdapterEnabled()) {
      throw new UnauthorizedException(
        'Local user context adapter is disabled in this environment',
      );
    }

    const request = context.switchToHttp().getRequest<UserContextRequest>();
    const rawHeader = request.headers[LOCAL_USER_ID_HEADER];
    const userId = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    if (!userId?.trim()) {
      throw new UnauthorizedException(
        'X-User-Id header is required for local development',
      );
    }

    const user = await this.usersService.findById(userId.trim());
    request[REQUEST_USER_ID_KEY] = user.id;
    return true;
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
