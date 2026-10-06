import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AUTH_ERROR_CODE, FIREBASE_TOKEN_VERIFIER } from '../src/auth/auth.constants';
import { AuthUnauthorizedException } from '../src/auth/exceptions/auth-unauthorized.exception';
import { FirebaseTokenVerifier } from '../src/auth/interfaces/firebase-token-verifier';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let tokenVerifier: jest.Mocked<FirebaseTokenVerifier>;

  beforeAll(async () => {
    tokenVerifier = {
      verifyIdToken: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FIREBASE_TOKEN_VERIFIER)
      .useValue(tokenVerifier)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    tokenVerifier.verifyIdToken.mockReset();
  });

  it('GET /v1/auth/me returns the authenticated user for a valid token', async () => {
    tokenVerifier.verifyIdToken.mockResolvedValue({
      userId: 'firebase-uid',
      email: 'user@example.com',
      claims: { uid: 'firebase-uid' },
    });

    const response = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(tokenVerifier.verifyIdToken.mock.calls).toEqual([['valid-token']]);
    expect(response.body).toEqual({
      userId: 'firebase-uid',
      email: 'user@example.com',
    });
    expect(response.body).not.toHaveProperty('claims');
    expect(response.body).not.toHaveProperty('token');
  });

  it('GET /v1/auth/me returns 401 when token is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .expect(401);

    expect(response.body).toEqual({
      statusCode: 401,
      code: AUTH_ERROR_CODE.TOKEN_MISSING,
      message: 'Authentication token is required',
    });
    expect(response.body).not.toHaveProperty('stack');
    expect(tokenVerifier.verifyIdToken.mock.calls).toHaveLength(0);
  });

  it('GET /v1/auth/me returns 401 when token is invalid or expired', async () => {
    tokenVerifier.verifyIdToken.mockRejectedValue(
      new AuthUnauthorizedException(
        AUTH_ERROR_CODE.TOKEN_INVALID,
        'Authentication token is invalid or expired',
      ),
    );

    const response = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer expired-token')
      .expect(401);

    expect(response.body).toEqual({
      statusCode: 401,
      code: AUTH_ERROR_CODE.TOKEN_INVALID,
      message: 'Authentication token is invalid or expired',
    });
    expect(JSON.stringify(response.body)).not.toMatch(/stack|credential|private/i);
  });
});
