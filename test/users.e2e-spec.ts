import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    expect(response.body.message).toEqual(
      expect.arrayContaining([expect.stringContaining('property password')]),
    );
  });

  it('POST /v1/users rejects invalid email', async () => {
    await request(app.getHttpServer())
      .post('/v1/users')
      .send({ email: 'not-an-email' })
      .expect(400);
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
      message: 'Email already in use',
    });
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
      message: 'User not found',
    });
  });
});
