import { ConfigService } from '@nestjs/config';
import { AUTH_ERROR_CODE } from '../auth.constants';
import { AuthUnauthorizedException } from '../exceptions/auth-unauthorized.exception';
import {
  assertFirebaseAdminProjectConfig,
  FirebaseTokenVerifierService,
  projectIdFromServiceAccountEmail,
} from './firebase-token.verifier';

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

describe('projectIdFromServiceAccountEmail', () => {
  it('parses project id from service account email', () => {
    expect(
      projectIdFromServiceAccountEmail(
        'firebase-adminsdk@autotrack-api-35b3f.iam.gserviceaccount.com',
      ),
    ).toBe('autotrack-api-35b3f');
  });

  it('returns null for non service-account emails', () => {
    expect(projectIdFromServiceAccountEmail('dev@example.com')).toBeNull();
  });
});

describe('assertFirebaseAdminProjectConfig', () => {
  it('accepts matching project id and service account', () => {
    expect(() =>
      assertFirebaseAdminProjectConfig(
        'autotrack-api-35b3f',
        'firebase@autotrack-api-35b3f.iam.gserviceaccount.com',
      ),
    ).not.toThrow();
  });

  it('rejects numeric-only project ids', () => {
    expect(() =>
      assertFirebaseAdminProjectConfig(
        '105454918401619303022',
        'firebase@autotrack-api-35b3f.iam.gserviceaccount.com',
      ),
    ).toThrow(/looks numeric/);
  });

  it('rejects project id that does not match service account email', () => {
    expect(() =>
      assertFirebaseAdminProjectConfig(
        'other-project',
        'firebase@autotrack-api-35b3f.iam.gserviceaccount.com',
      ),
    ).toThrow(/does not match/);
  });
});

describe('FirebaseTokenVerifierService', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        FIREBASE_PROJECT_ID: 'autotrack-api-35b3f',
        FIREBASE_CLIENT_EMAIL:
          'firebase@autotrack-api-35b3f.iam.gserviceaccount.com',
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
      aud: 'autotrack-api-35b3f',
    });

    const service = new FirebaseTokenVerifierService(configService);
    const user = await service.verifyIdToken('valid-token');

    expect(certMock).toHaveBeenCalledWith({
      projectId: 'autotrack-api-35b3f',
      clientEmail: 'firebase@autotrack-api-35b3f.iam.gserviceaccount.com',
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
        aud: 'autotrack-api-35b3f',
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

  it('fails fast when FIREBASE_PROJECT_ID does not match the service account', async () => {
    const badConfig = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          FIREBASE_PROJECT_ID: '105454918401619303022',
          FIREBASE_CLIENT_EMAIL:
            'firebase@autotrack-api-35b3f.iam.gserviceaccount.com',
          FIREBASE_PRIVATE_KEY:
            '-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n',
        };
        return values[key];
      }),
    } as unknown as ConfigService;

    const service = new FirebaseTokenVerifierService(badConfig);

    await expect(service.verifyIdToken('any')).rejects.toThrow(/looks numeric/);
    expect(initializeAppMock).not.toHaveBeenCalled();
  });
});
