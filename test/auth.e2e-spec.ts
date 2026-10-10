import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AUTH_ERROR_CODE } from '../src/auth/auth.constants';
import { AuthUnauthorizedException } from '../src/auth/exceptions/auth-unauthorized.exception';
import type { FirebaseTokenVerifier } from '../src/auth/interfaces/firebase-token-verifier';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createAuthenticatedUser,
  createFirebaseTokenVerifierMock,
} from './helpers/auth';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenVerifier: jest.Mocked<FirebaseTokenVerifier>;

  beforeAll(async () => {
    tokenVerifier = createFirebaseTokenVerifierMock();
    const setup = await createTestApp({ firebaseVerifier: tokenVerifier });
    app = setup.app;
    prisma = setup.prisma;
  });

  afterEach(async () => {
    tokenVerifier.verifyIdToken.mockReset();
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/auth/me returns the authenticated user for a valid token', async () => {
    tokenVerifier.verifyIdToken.mockResolvedValue(createAuthenticatedUser());

    const response = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(tokenVerifier.verifyIdToken.mock.calls).toEqual([['valid-token']]);
    expect(response.body).toEqual({
      userId: 'firebase-uid',
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
      emailVerified: true,
      localUserId: null,
    });
    expect(response.body).not.toHaveProperty('claims');
    expect(response.body).not.toHaveProperty('token');
  });

  it('GET /v1/auth/me returns 401 when token is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .expect(401);

    expect(response.body).toMatchObject({
      statusCode: 401,
      code: AUTH_ERROR_CODE.TOKEN_MISSING,
      message: 'Authentication token is required',
    });
    expect(response.body.requestId).toEqual(expect.any(String));
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

    expect(response.body).toMatchObject({
      statusCode: 401,
      code: AUTH_ERROR_CODE.TOKEN_INVALID,
      message: 'Authentication token is invalid or expired',
    });
    expect(JSON.stringify(response.body)).not.toMatch(
      /stack|credential|private/i,
    );
  });

  it('POST /v1/auth/bootstrap creates local profile on first auth', async () => {
    tokenVerifier.verifyIdToken.mockResolvedValue(
      createAuthenticatedUser({ name: 'Ada Lovelace' }),
    );

    const response = await request(app.getHttpServer())
      .post('/v1/auth/bootstrap')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(response.body).toMatchObject({
      created: true,
      user: {
        firebaseUid: 'firebase-uid',
        email: 'user@example.com',
        name: 'Ada Lovelace',
      },
    });
    expect(response.body.user.id).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty('password');
    expect(JSON.stringify(response.body)).not.toMatch(/token|refresh|hash/i);

    const me = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(me.body.localUserId).toBe(response.body.user.id);
  });

  it('POST /v1/auth/bootstrap is idempotent for the same firebaseUid', async () => {
    tokenVerifier.verifyIdToken.mockResolvedValue(createAuthenticatedUser());

    const first = await request(app.getHttpServer())
      .post('/v1/auth/bootstrap')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    const second = await request(app.getHttpServer())
      .post('/v1/auth/bootstrap')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(first.body.created).toBe(true);
    expect(second.body.created).toBe(false);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it('POST /v1/auth/bootstrap returns 409 on email collision with another identity', async () => {
    await prisma.user.create({
      data: {
        email: 'user@example.com',
        firebaseUid: 'other-firebase-uid',
      },
    });

    tokenVerifier.verifyIdToken.mockResolvedValue(createAuthenticatedUser());

    const response = await request(app.getHttpServer())
      .post('/v1/auth/bootstrap')
      .set('Authorization', 'Bearer valid-token')
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      message: 'Email already linked to another Firebase identity',
    });
  });

  it('GET /v1/users/me returns bootstrapped profile and isolates users', async () => {
    tokenVerifier.verifyIdToken.mockResolvedValue(createAuthenticatedUser());

    const bootstrap = await request(app.getHttpServer())
      .post('/v1/auth/bootstrap')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(me.body).toMatchObject({
      id: bootstrap.body.user.id,
      firebaseUid: 'firebase-uid',
      email: 'user@example.com',
    });

    tokenVerifier.verifyIdToken.mockResolvedValue(
      createAuthenticatedUser({
        firebaseUid: 'other-uid',
        userId: 'other-uid',
        email: 'other@example.com',
      }),
    );

    await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', 'Bearer other-token')
      .expect(404);
  });
});
