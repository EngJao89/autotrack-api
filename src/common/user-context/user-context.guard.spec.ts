import {
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { REQUEST_USER_ID_KEY } from './user-context.constants';
import { UserContextGuard } from './user-context.guard';

describe('UserContextGuard', () => {
  let guard: UserContextGuard;
  let configService: { get: jest.Mock };
  let usersService: { findById: jest.Mock };

  const createContext = (userId?: string): ExecutionContext => {
    const request = {
      headers: userId ? { 'x-user-id': userId } : {},
      [REQUEST_USER_ID_KEY]: undefined as string | undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        if (key === 'LOCAL_USER_ID_HEADER_ENABLED') return undefined;
        return undefined;
      }),
    };
    usersService = {
      findById: jest.fn(),
    };
    guard = new UserContextGuard(
      configService as unknown as ConfigService,
      usersService as unknown as UsersService,
    );
  });

  it('resolves a valid local user id', async () => {
    usersService.findById.mockResolvedValue({ id: 'user_1' });
    const context = createContext('user_1');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest()[REQUEST_USER_ID_KEY]).toBe(
      'user_1',
    );
  });

  it('rejects missing local user id header', async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects unknown users', async () => {
    usersService.findById.mockRejectedValue(new NotFoundException('User not found'));

    await expect(
      guard.canActivate(createContext('missing')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('is disabled in production', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });

    await expect(
      guard.canActivate(createContext('user_1')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.findById).not.toHaveBeenCalled();
  });
});
