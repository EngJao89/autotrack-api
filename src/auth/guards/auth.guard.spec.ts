import { ExecutionContext } from '@nestjs/common';
import { AUTH_ERROR_CODE } from '../auth.constants';
import { AuthUnauthorizedException } from '../exceptions/auth-unauthorized.exception';
import { FirebaseTokenVerifier } from '../interfaces/firebase-token-verifier';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let tokenVerifier: jest.Mocked<FirebaseTokenVerifier>;

  const createContext = (authorization?: string): ExecutionContext => {
    const request = {
      headers: { authorization },
      user: undefined as unknown,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  };

  beforeEach(() => {
    tokenVerifier = {
      verifyIdToken: jest.fn(),
    };
    guard = new AuthGuard(tokenVerifier);
  });

  it('accepts a valid bearer token and attaches the user', async () => {
    const user = {
      userId: 'firebase-uid',
      email: 'user@example.com',
      claims: { uid: 'firebase-uid' },
    };
    tokenVerifier.verifyIdToken.mockResolvedValue(user);
    const context = createContext('Bearer valid-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(tokenVerifier.verifyIdToken.mock.calls).toEqual([['valid-token']]);
    expect(context.switchToHttp().getRequest().user).toEqual(user);
  });

  it('rejects missing token', async () => {
    const context = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      AuthUnauthorizedException,
    );

    try {
      await guard.canActivate(context);
    } catch (error) {
      expect((error as AuthUnauthorizedException).getResponse()).toEqual({
        statusCode: 401,
        code: AUTH_ERROR_CODE.TOKEN_MISSING,
        message: 'Authentication token is required',
      });
    }
  });

  it('rejects malformed authorization header', async () => {
    const context = createContext('Token valid-token');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        code: AUTH_ERROR_CODE.TOKEN_MISSING,
      },
    });
  });

  it('propagates invalid or expired token errors', async () => {
    tokenVerifier.verifyIdToken.mockRejectedValue(
      new AuthUnauthorizedException(
        AUTH_ERROR_CODE.TOKEN_INVALID,
        'Authentication token is invalid or expired',
      ),
    );
    const context = createContext('Bearer expired-token');

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: {
        statusCode: 401,
        code: AUTH_ERROR_CODE.TOKEN_INVALID,
        message: 'Authentication token is invalid or expired',
      },
    });
  });
});
