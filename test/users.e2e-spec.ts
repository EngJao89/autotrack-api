import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { API_ERROR_CODE } from '../src/common/errors/error-codes';
import { PrismaService } from '../src/prisma/prisma.service';
import { validUserProfile, buildCreateUserPayload } from './fixtures/users';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
  });

  afterEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/users creates a user', async () => {
    const payload = buildCreateUserPayload();

    const response = await request(app.getHttpServer())
      .post('/v1/users')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject(payload);
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty('password');
  });

  it('POST /v1/users rejects invalid payload and unknown fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/users')
      .send({
        email: 'not-an-email',
        password: 'should-be-rejected',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODE.VALIDATION_ERROR,
      message: 'Request validation failed',
    });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email' }),
        expect.objectContaining({ field: 'password' }),
      ]),
    );
  });

  it('GET /v1/users/:id returns 404 for missing user', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/missing-user-id')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: API_ERROR_CODE.NOT_FOUND,
      message: 'User not found',
    });
  });

  it('PUT/PATCH/DELETE manage owned profile with isolation', async () => {
    const created = await request(app.getHttpServer())
      .post('/v1/users')
      .send(buildCreateUserPayload({ name: 'Before' }))
      .expect(201);
    const userId = created.body.id as string;

    const other = await request(app.getHttpServer())
      .post('/v1/users')
      .send(buildCreateUserPayload({ name: 'Other' }))
      .expect(201);

    await request(app.getHttpServer())
      .put(`/v1/users/${userId}`)
      .send(validUserProfile)
      .expect(401);

    await request(app.getHttpServer())
      .patch(`/v1/users/${userId}`)
      .set('X-User-Id', other.body.id)
      .send({ name: 'Hack' })
      .expect(403);

    const replaced = await request(app.getHttpServer())
      .put(`/v1/users/${userId}`)
      .set('X-User-Id', userId)
      .send(validUserProfile)
      .expect(200);

    expect(replaced.body).toMatchObject({
      ...validUserProfile,
      id: userId,
    });

    await request(app.getHttpServer())
      .delete(`/v1/users/${userId}`)
      .set('X-User-Id', userId)
      .expect(204);

    await request(app.getHttpServer()).get(`/v1/users/${userId}`).expect(404);
  });
});
