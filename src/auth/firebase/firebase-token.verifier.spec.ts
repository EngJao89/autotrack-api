import { ConfigService } from '@nestjs/config';
import { AUTH_ERROR_CODE } from '../auth.constants';
import { AuthUnauthorizedException } from '../exceptions/auth-unauthorized.exception';
import { FirebaseTokenVerifierService } from './firebase-token.verifier';

const verifyIdToken = jest.fn();
const getAuthMock = jest.fn((_app?: unknown) => ({ verifyIdToken }));
const getAppsMock = jest.fn(() => [] as unknown[]);
const initializeAppMock = jest.fn((_options?: unknown) => ({ name: 'test-app' }));
const certMock = jest.fn((value: unknown) => value);

jest.mock('firebase-admin/app', () => ({
  cert: (value: unknown) => certMock(value),
  getApps: () => getAppsMock(),
  initializeApp: (options: unknown) => initializeAppMock(options),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: (app: unknown) => getAuthMock(app),
}));

describe('FirebaseTokenVerifierService', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        FIREBASE_PROJECT_ID: 'autotrack-dev',
        FIREBASE_CLIENT_EMAIL: 'firebase@autotrack.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY:
          '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    getAppsMock.mockReturnValue([]);
  });

  it('verifies a token and maps uid/email/claims', async () => {
    verifyIdToken.mockResolvedValue({
      uid: 'firebase-uid',
      email: 'user@example.com',
      email_verified: true,
      name: 'Ada',
      aud: 'autotrack-dev',
    });

    const service = new FirebaseTokenVerifierService(configService);
    const user = await service.verifyIdToken('valid-token');

    expect(certMock).toHaveBeenCalledWith({
      projectId: 'autotrack-dev',
      clientEmail: 'firebase@autotrack.iam.gserviceaccount.com',
      privateKey:
        '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n',
    });
    expect(user).toEqual({
      userId: 'firebase-uid',
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
      emailVerified: true,
      name: 'Ada',
      claims: {
        uid: 'firebase-uid',
        email: 'user@example.com',
        email_verified: true,
        name: 'Ada',
        aud: 'autotrack-dev',
      },
    });
  });

  it('maps verification failures to AUTH_TOKEN_INVALID without leaking details', async () => {
    verifyIdToken.mockRejectedValue(new Error('token expired detail'));

    const service = new FirebaseTokenVerifierService(configService);

    await expect(service.verifyIdToken('expired')).rejects.toBeInstanceOf(
      AuthUnauthorizedException,
    );

    try {
      await service.verifyIdToken('expired');
    } catch (error) {
      const response = (error as AuthUnauthorizedException).getResponse();
      expect(response).toEqual({
        statusCode: 401,
        code: AUTH_ERROR_CODE.TOKEN_INVALID,
        message: 'Authentication token is invalid or expired',
      });
      expect(JSON.stringify(response)).not.toContain('token expired detail');
    }
  });
});
