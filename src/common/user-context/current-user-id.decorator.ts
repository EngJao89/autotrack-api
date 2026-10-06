import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { REQUEST_USER_ID_KEY } from './user-context.constants';

type UserContextRequest = Request & {
  [REQUEST_USER_ID_KEY]?: string;
};

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<UserContextRequest>();
    const userId = request[REQUEST_USER_ID_KEY];

    if (!userId) {
      throw new Error('CurrentUserId used without UserContextGuard');
    }

    return userId;
  },
);
