import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MaintenancesController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdUserIds: string[] = [];
  const createdVehicleIds: string[] = [];
  const createdMaintenanceIds: string[] = [];

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
    if (createdMaintenanceIds.length > 0) {
      await prisma.maintenance.deleteMany({
        where: { id: { in: createdMaintenanceIds } },
      });
    }
    if (createdVehicleIds.length > 0) {
      await prisma.vehicle.deleteMany({
        where: { id: { in: createdVehicleIds } },
      });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app.close();
  });

  async function createUser(prefix: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/v1/users')
      .send({
        email: `${prefix}-${Date.now()}@example.com`,
        name: prefix,
      })
      .expect(201);
    createdUserIds.push(response.body.id);
    return response.body.id as string;
  }

  async function createVehicle(userId: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', userId)
      .send({ brand: 'Toyota', model: 'Corolla', year: 2022 })
      .expect(201);
    createdVehicleIds.push(response.body.id);
    return response.body.id as string;
  }

  it('creates, lists with filters, updates and deletes maintenance', async () => {
    const userId = await createUser('maint-owner');
    const vehicleId = await createVehicle(userId);

    const created = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .send({
        type: 'Troca de óleo',
        description: 'Troca de óleo e filtro',
        serviceDate: '2026-10-03T00:00:00.000Z',
        odometerKm: 45000,
        costCents: 18990,
        workshopName: 'Oficina AutoTrack',
        notes: 'Próxima troca em 10.000 km',
      })
      .expect(201);

    createdMaintenanceIds.push(created.body.id);
    expect(created.body).toMatchObject({
      vehicleId,
      type: 'Troca de óleo',
      description: 'Troca de óleo e filtro',
      odometerKm: 45000,
      costCents: 18990,
      workshopName: 'Oficina AutoTrack',
    });
    expect(created.body).not.toHaveProperty('custo');

    await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .send({
        type: 'Pneus',
        serviceDate: '2025-05-01T00:00:00.000Z',
        odometerKm: 20000,
        costCents: 50000,
      })
      .expect(201)
      .then((response) => createdMaintenanceIds.push(response.body.id));

    const filtered = await request(app.getHttpServer())
      .get(`/v1/vehicles/${vehicleId}/maintenances`)
      .query({
        type: 'Troca de óleo',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.999Z',
        odometerMin: 40000,
        odometerMax: 50000,
      })
      .set('X-User-Id', userId)
      .expect(200);

    expect(filtered.body).toHaveLength(1);
    expect(filtered.body[0].id).toBe(created.body.id);

    const listed = await request(app.getHttpServer())
      .get(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .expect(200);

    expect(listed.body[0].serviceDate >= listed.body[1].serviceDate).toBe(true);

    const updated = await request(app.getHttpServer())
      .patch(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', userId)
      .send({ notes: 'Atualizado', costCents: 19990 })
      .expect(200);

    expect(updated.body).toMatchObject({
      id: created.body.id,
      vehicleId,
      notes: 'Atualizado',
      costCents: 19990,
    });

    await request(app.getHttpServer())
      .delete(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(404);
  });

  it('isolates maintenance access by vehicle ownership', async () => {
    const ownerId = await createUser('maint-iso-owner');
    const otherId = await createUser('maint-iso-other');
    const vehicleId = await createVehicle(ownerId);

    const created = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', ownerId)
      .send({
        type: 'Preventiva',
        serviceDate: '2026-10-03T00:00:00.000Z',
      })
      .expect(201);
    createdMaintenanceIds.push(created.body.id);

    await request(app.getHttpServer())
      .get(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', otherId)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', otherId)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', otherId)
      .send({ notes: 'hack' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/v1/maintenances/${created.body.id}`)
      .set('X-User-Id', otherId)
      .expect(404);
  });

  it('rejects invalid payloads and forbidden fields', async () => {
    const userId = await createUser('maint-validation');
    const vehicleId = await createVehicle(userId);

    await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .send({
        type: 'Tipo inválido',
        serviceDate: '2026-10-03T00:00:00.000Z',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .send({
        type: 'Preventiva',
        serviceDate: 'not-a-date',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .send({
        type: 'Preventiva',
        serviceDate: '2026-10-03T00:00:00.000Z',
        costCents: -1,
        odometerKm: -10,
      })
      .expect(400);

    const forbidden = await request(app.getHttpServer())
      .post(`/v1/vehicles/${vehicleId}/maintenances`)
      .set('X-User-Id', userId)
      .send({
        type: 'Preventiva',
        serviceDate: '2026-10-03T00:00:00.000Z',
        vehicleId: 'forced-vehicle',
        id: 'forced-id',
      })
      .expect(400);

    expect(forbidden.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('property vehicleId'),
        expect.stringContaining('property id'),
      ]),
    );
  });
});
