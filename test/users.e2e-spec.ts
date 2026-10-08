import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { API_ERROR_CODE } from '../src/common/errors/error-codes';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './utils/create-test-app';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const setup = await createTestApp();
    app = setup.app;
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
    }
    await app.close();
  });

  it('POST /v1/users creates a user', async () => {
    const email = `create-${Date.now()}@example.com`;

    const response = await request(app.getHttpServer())
      .post('/v1/users')
      .send({ email, name: 'Example User' })
      .expect(201);

    createdIds.push(response.body.id);
    expect(response.body).toMatchObject({
      email,
      name: 'Example User',
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body).not.toHaveProperty('password');
  });

  it('POST /v1/users normalizes email and rejects forbidden fields', async () => {
    const rawEmail = `  Norm-${Date.now()}@Example.COM `;

    const response = await request(app.getHttpServer())
      .post('/v1/users')
      .send({
        email: rawEmail,
        name: 'Normalized',
        password: 'should-be-rejected',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODE.VALIDATION_ERROR,
      message: 'Request validation failed',
    });
    expect(response.body.requestId).toEqual(expect.any(String));
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
          messages: expect.arrayContaining([
            expect.stringContaining('property password'),
          ]),
        }),
      ]),
    );
  });

  it('POST /v1/users rejects invalid email', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/users')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODE.VALIDATION_ERROR,
      message: 'Request validation failed',
    });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
        }),
      ]),
    );
  });

  it('POST /v1/users returns conflict for duplicated email', async () => {
    const email = `dup-${Date.now()}@example.com`;

    const first = await request(app.getHttpServer())
      .post('/v1/users')
      .send({ email })
      .expect(201);
    createdIds.push(first.body.id);

    const duplicate = await request(app.getHttpServer())
      .post('/v1/users')
      .send({ email: email.toUpperCase() })
      .expect(409);

    expect(duplicate.body).toMatchObject({
      statusCode: 409,
      code: API_ERROR_CODE.CONFLICT,
      message: 'Email already in use',
    });
    expect(duplicate.body.requestId).toEqual(expect.any(String));
  });

  it('GET /v1/users/:id returns the user', async () => {
    const email = `get-${Date.now()}@example.com`;
    const created = await request(app.getHttpServer())
      .post('/v1/users')
      .send({ email, name: 'Find Me' })
      .expect(201);
    createdIds.push(created.body.id);

    const response = await request(app.getHttpServer())
      .get(`/v1/users/${created.body.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,
      email,
      name: 'Find Me',
    });
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
    expect(response.body.requestId).toEqual(expect.any(String));
  });
});
