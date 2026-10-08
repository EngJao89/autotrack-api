import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { API_ERROR_CODE } from '../src/common/errors/error-codes';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildMaintenancePayload } from './fixtures/maintenances';
import { buildCreateUserPayload } from './fixtures/users';
import { buildVehiclePayload } from './fixtures/vehicles';
import { createTestApp } from './helpers/create-test-app';
import { resetDatabase } from './helpers/database';

describe('MaintenancesController (e2e)', () => {
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

  it('creates, filters, updates and deletes maintenance for owned vehicle', async () => {
    const { userId, vehicleId } = await createOwnedVehicle();

    const created = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .send(buildMaintenancePayload())
      .expect(201);

    expect(created.body).toMatchObject({
      vehicleId,
      type: 'Troca de óleo',
      costCents: 18990,
    });

    await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .send(
        buildMaintenancePayload({
          type: 'Pneus',
          serviceDate: '2025-05-01T00:00:00.000Z',
          odometerKm: 20000,
        }),
      )
      .expect(201);

    const filtered = await request(app.getHttpServer())
      .get(`/v1/vehicles/${vehicleId}/maintenances`)
      .query({
        type: 'Troca de óleo',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.999Z',
      })
      .set('X-User-Id', userId)
      .expect(200);

    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].id).toBe(created.body.id);

    await request(app.getHttpServer())
      .patch(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', userId)
      .send({ notes: 'Atualizado' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(404);
  });

  it('rejects invalid maintenance payloads and foreign ownership', async () => {
    const owner = await createOwnedVehicle();
    const otherUser = await request(app.getHttpServer())
      .post('/v1/users')
      .send(buildCreateUserPayload({ name: 'Other' }))
      .expect(201);

    const created = await request(app.getHttpServer())
      .post(`/v1/vehicles/${owner.vehicleId}/maintenances`)
      .set('X-User-Id', owner.userId)
      .send(buildMaintenancePayload({ type: 'Preventiva' }))
      .expect(201);

    await request(app.getHttpServer())
      .get(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', otherUser.body.id)
      .expect(404);

    const invalid = await request(app.getHttpServer())
      .post(`/v1/vehicles/${owner.vehicleId}/maintenances`)
      .set('X-User-Id', owner.userId)
      .send({
        type: 'Tipo inválido',
        serviceDate: '2026-10-03T00:00:00.000Z',
      })
      .expect(400);

    expect(invalid.body).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODE.VALIDATION_ERROR,
    });
  });
});
