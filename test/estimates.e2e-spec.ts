import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { API_ERROR_CODE } from '../src/common/errors/error-codes';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildEstimatePayload } from './fixtures/estimates';
import { buildCreateUserPayload } from './fixtures/users';
import { buildVehiclePayload } from './fixtures/vehicles';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';

describe('EstimatesController (e2e)', () => {
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

  async function createOwnedVehicle(): Promise<{
    userId: string;
    vehicleId: string;
  }> {
    const user = await request(app.getHttpServer())
      .post('/v1/users')
      .send(buildCreateUserPayload())
      .expect(201);

    const vehicle = await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', user.body.id)
      .send(buildVehiclePayload())
      .expect(201);

    return { userId: user.body.id, vehicleId: vehicle.body.id };
  }

  it('creates, lists, updates, finalizes and deletes estimate', async () => {
    const { userId, vehicleId } = await createOwnedVehicle();

    const created = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/estimates`)
      .set('X-User-Id', userId)
      .send(buildEstimatePayload())
      .expect(201);

    expect(created.body).toMatchObject({
      vehicleId,
      title: 'Troca de embreagem',
      currency: 'BRL',
      status: 'DRAFT',
      totalCents: 124000,
    });
    expect(created.body.items).toHaveLength(2);

    const listed = await request(app.getHttpServer())
      .get(`/v1/vehicles/${vehicleId}/estimates`)
      .set('X-User-Id', userId)
      .expect(200);

    expect(listed.body).toHaveLength(1);

    const userListed = await request(app.getHttpServer())
      .get('/v1/estimates')
      .query({ vehicleId })
      .set('X-User-Id', userId)
      .expect(200);

    expect(userListed.body).toHaveLength(1);

    const patched = await request(app.getHttpServer())
      .patch(`/v1/estimates/${created.body.id}`)
      .set('X-User-Id', userId)
      .send({
        title: 'Orçamento revisado',
        items: [
          {
            description: 'Peça única',
            category: 'PART',
            quantity: 2,
            unitPriceCents: 1000,
          },
        ],
      })
      .expect(200);

    expect(patched.body.title).toBe('Orçamento revisado');
    expect(patched.body.totalCents).toBe(2000);
    expect(patched.body.items).toHaveLength(1);

    await request(app.getHttpServer())
      .patch(`/v1/estimates/${created.body.id}`)
      .set('X-User-Id', userId)
      .send({ status: 'FINALIZED' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/v1/estimates/${created.body.id}`)
      .set('X-User-Id', userId)
      .send({ title: 'Não deve editar' })
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/v1/estimates/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/estimates/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(404);
  });

  it('returns 404 for other user estimate', async () => {
    const owner = await createOwnedVehicle();
    const other = await request(app.getHttpServer())
      .post('/v1/users')
      .send(buildCreateUserPayload({ email: 'other-est@example.com' }))
      .expect(201);

    const created = await request(app.getHttpServer())
      .post(`/v1/vehicles/${owner.vehicleId}/estimates`)
      .set('X-User-Id', owner.userId)
      .send(buildEstimatePayload())
      .expect(201);

    await request(app.getHttpServer())
      .get(`/v1/estimates/${created.body.id}`)
      .set('X-User-Id', other.body.id)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/v1/estimates/${created.body.id}`)
      .set('X-User-Id', other.body.id)
      .send({ title: 'hack' })
      .expect(404);
  });

  it('rejects invalid item payload', async () => {
    const { userId, vehicleId } = await createOwnedVehicle();

    const res = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/estimates`)
      .set('X-User-Id', userId)
      .send({
        title: 'Inválido',
        items: [
          {
            description: 'Peça',
            category: 'PART',
            quantity: 0,
            unitPriceCents: -1,
          },
        ],
      })
      .expect(400);

    expect(res.body.code).toBe(API_ERROR_CODE.VALIDATION_ERROR);
  });
});
