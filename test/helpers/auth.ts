import { AUTH_ERROR_CODE } from '../../src/auth/auth.constants';
import { AuthUnauthorizedException } from '../../src/auth/exceptions/auth-unauthorized.exception';
import type { AuthenticatedUser } from '../../src/auth/interfaces/authenticated-user';
import type { FirebaseTokenVerifier } from '../../src/auth/interfaces/firebase-token-verifier';

export function createFirebaseTokenVerifierMock(
  overrides?: Partial<FirebaseTokenVerifier>,
): jest.Mocked<FirebaseTokenVerifier> {
  return {
    verifyIdToken: jest.fn(async () => {
      throw new AuthUnauthorizedException(
        AUTH_ERROR_CODE.TOKEN_INVALID,
        'Authentication token is invalid or expired',
      );
    }),
    ...overrides,
  } as jest.Mocked<FirebaseTokenVerifier>;
}

export function createAuthenticatedUser(
  overrides?: Partial<AuthenticatedUser>,
): AuthenticatedUser {
  return {
    userId: 'firebase-uid',
    email: 'user@example.com',
    claims: { uid: 'firebase-uid' },
    ...overrides,
  };
}
