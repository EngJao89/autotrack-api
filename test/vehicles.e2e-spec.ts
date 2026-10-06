import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('VehiclesController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const createdUserIds: string[] = [];
  const createdVehicleIds: string[] = [];

  const vehiclePayload = {
    brand: 'Toyota',
    model: 'Corolla',
    version: 'XEi 2.0',
    year: 2022,
    licensePlate: 'abc1d23',
    color: 'Prata',
    fuelType: 'Flex',
    odometerKm: 45000,
  };

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

  it('creates, lists, updates and deletes vehicles for the local user', async () => {
    const userId = await createUser('owner');

    const created = await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', userId)
      .send(vehiclePayload)
      .expect(201);

    createdVehicleIds.push(created.body.id);
    expect(created.body).toMatchObject({
      userId,
      brand: 'Toyota',
      model: 'Corolla',
      version: 'XEi 2.0',
      year: 2022,
      licensePlate: 'ABC1D23',
      color: 'Prata',
      fuelType: 'flex',
      odometerKm: 45000,
    });
    expect(created.body).not.toHaveProperty('password');

    const listed = await request(app.getHttpServer())
      .get('/v1/vehicles')
      .set('X-User-Id', userId)
      .expect(200);

    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: created.body.id, userId }),
      ]),
    );

    const updated = await request(app.getHttpServer())
      .patch(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', userId)
      .send({ color: 'Preto', odometerKm: 46000 })
      .expect(200);

    expect(updated.body).toMatchObject({
      id: created.body.id,
      userId,
      color: 'Preto',
      odometerKm: 46000,
    });

    await request(app.getHttpServer())
      .delete(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', userId)
      .expect(404);
  });

  it('isolates vehicles between users', async () => {
    const ownerId = await createUser('owner-iso');
    const otherId = await createUser('other-iso');

    const created = await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', ownerId)
      .send({ brand: 'Honda', model: 'Civic', year: 2021 })
      .expect(201);
    createdVehicleIds.push(created.body.id);

    const otherList = await request(app.getHttpServer())
      .get('/v1/vehicles')
      .set('X-User-Id', otherId)
      .expect(200);

    expect(otherList.body).toEqual([]);

    await request(app.getHttpServer())
      .get(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', otherId)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', otherId)
      .send({ color: 'Azul' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/v1/vehicles/${created.body.id}`)
      .set('X-User-Id', otherId)
      .expect(404);
  });

  it('rejects invalid payloads and forbidden ownership fields', async () => {
    const userId = await createUser('validation');

    await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', userId)
      .send({ brand: 'Toyota', model: 'Corolla', year: 1800 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', userId)
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        odometerKm: -1,
      })
      .expect(400);

    const forbidden = await request(app.getHttpServer())
      .post('/v1/vehicles')
      .set('X-User-Id', userId)
      .send({
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        userId: 'another-user',
        id: 'forced-id',
      })
      .expect(400);

    expect(forbidden.body.message).toEqual(
      expect.arrayContaining([
        expect.stringContaining('property userId'),
        expect.stringContaining('property id'),
      ]),
    );
  });

  it('requires the local user header', async () => {
    await request(app.getHttpServer()).get('/v1/vehicles').expect(401);
  });
});
