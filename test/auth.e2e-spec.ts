import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AUTH_ERROR_CODE } from '../src/auth/auth.constants';
import { AuthUnauthorizedException } from '../src/auth/exceptions/auth-unauthorized.exception';
import type { FirebaseTokenVerifier } from '../src/auth/interfaces/firebase-token-verifier';
import {
  createAuthenticatedUser,
  createFirebaseTokenVerifierMock,
} from './helpers/auth';
import { createTestApp } from './helpers/create-test-app';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let tokenVerifier: jest.Mocked<FirebaseTokenVerifier>;

  beforeAll(async () => {
    tokenVerifier = createFirebaseTokenVerifierMock();
    const setup = await createTestApp({ firebaseVerifier: tokenVerifier });
    app = setup.app;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    tokenVerifier.verifyIdToken.mockReset();
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
      email: 'user@example.com',
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
});
