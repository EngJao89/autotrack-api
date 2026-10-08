import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { API_ERROR_CODE } from '../src/common/errors/error-codes';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildCreateUserPayload } from './fixtures/users';
import { buildVehiclePayload } from './fixtures/vehicles';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';

describe('VehiclesController (e2e)', () => {
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

  async function createUser(): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/v1/users')
      .send(buildCreateUserPayload())
      .expect(201);
    return response.body.id as string;
  }

  it('creates, lists, updates and deletes vehicles for the local user', async () => {
    const userId = await createUser();

    const created = await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', userId)
      .send(buildVehiclePayload({ licensePlate: 'abc1d23', fuelType: 'Flex' }))
      .expect(201);

    expect(created.body).toMatchObject({
      userId,
      brand: 'Toyota',
      licensePlate: 'ABC1D23',
      fuelType: 'flex',
    });

    const listed = await request(app.getHttpServer())
      .get('/v1/vehicles')
      .set('X-User-Id', userId)
      .expect(200);

    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.body.id, userId }),
      ]),
    );

    await request(app.getHttpServer())
      .patch(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', userId)
      .send({ color: 'Preto' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(404);
  });

  it('isolates vehicles between users and rejects invalid payloads', async () => {
    const ownerId = await createUser();
    const otherId = await createUser();

    const created = await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', ownerId)
      .send(buildVehiclePayload({ brand: 'Honda', model: 'Civic', year: 2021 }))
      .expect(201);

    const otherList = await request(app.getHttpServer())
      .get('/v1/vehicles')
      .set('X-User-Id', otherId)
      .expect(200);
    expect(otherList.body).toEqual([]);

    await request(app.getHttpServer())
      .get(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', otherId)
      .expect(404);

    const invalid = await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', ownerId)
      .send({ brand: 'Toyota', model: 'Corolla', year: 1800 })
      .expect(400);

    expect(invalid.body).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODE.VALIDATION_ERROR,
    });

    await request(app.getHttpServer()).get('/v1/vehicles').expect(401);
  });
});
