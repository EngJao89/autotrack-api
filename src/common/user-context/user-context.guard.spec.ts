import {
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FirebaseTokenVerifier } from '../../auth/interfaces/firebase-token-verifier';
import { UsersService } from '../../users/users.service';
import { REQUEST_USER_ID_KEY } from './user-context.constants';
import { UserContextGuard } from './user-context.guard';

describe('UserContextGuard', () => {
  let guard: UserContextGuard;
  let configService: { get: jest.Mock };
  let usersService: {
    findById: jest.Mock;
    findByFirebaseUidOrThrow: jest.Mock;
  };
  let tokenVerifier: jest.Mocked<FirebaseTokenVerifier>;

  const createContext = (options?: {
    userId?: string;
    authorization?: string;
  }): ExecutionContext => {
    const headers: Record<string, string> = {};
    if (options?.userId) headers['x-user-id'] = options.userId;
    if (options?.authorization) headers.authorization = options.authorization;

    const request = {
      headers,
      [REQUEST_USER_ID_KEY]: undefined as string | undefined,
      user: undefined as unknown,
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
      findByFirebaseUidOrThrow: jest.fn(),
    };
    tokenVerifier = {
      verifyIdToken: jest.fn(),
    };
    guard = new UserContextGuard(
      configService as unknown as ConfigService,
      usersService as unknown as UsersService,
      tokenVerifier,
    );
  });

  it('resolves local user from Bearer firebaseUid', async () => {
    tokenVerifier.verifyIdToken.mockResolvedValue({
      userId: 'firebase-uid',
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
      claims: { uid: 'firebase-uid' },
    });
    usersService.findByFirebaseUidOrThrow.mockResolvedValue({ id: 'local_1' });
    const context = createContext({ authorization: 'Bearer valid-token' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tokenVerifier.verifyIdToken.mock.calls).toEqual([['valid-token']]);
    expect(usersService.findByFirebaseUidOrThrow.mock.calls).toEqual([
      ['firebase-uid'],
    ]);
    expect(context.switchToHttp().getRequest()[REQUEST_USER_ID_KEY]).toBe(
      'local_1',
    );
    expect(usersService.findById).not.toHaveBeenCalled();
  });

  it('falls back to X-User-Id in development', async () => {
    usersService.findById.mockResolvedValue({ id: 'user_1' });
    const context = createContext({ userId: 'user_1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest()[REQUEST_USER_ID_KEY]).toBe(
      'user_1',
    );
  });

  it('rejects missing local user id header when no bearer', async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects unknown users via X-User-Id', async () => {
    usersService.findById.mockRejectedValue(new NotFoundException('User not found'));

    await expect(
      guard.canActivate(createContext({ userId: 'missing' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('requires Bearer in production (local adapter disabled)', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') return 'production';
      return undefined;
    });

    await expect(
      guard.canActivate(createContext({ userId: 'user_1' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.findById).not.toHaveBeenCalled();
  });
});
