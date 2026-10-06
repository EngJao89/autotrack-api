import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let prisma: PrismaService;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [PrismaService],
    }).compile();

    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('should be injectable', () => {
    expect(prisma).toBeDefined();
  });

  it('should persist and read User, Vehicle and Maintenance', async () => {
    const email = `prisma-validation-${Date.now()}@autotrack.test`;

    const user = await prisma.user.create({
      data: {
        email,
        name: 'Validação Prisma',
        vehicles: {
          create: {
            brand: 'Toyota',
            model: 'Corolla',
            year: 2020,
            licensePlate: 'ABC1D23',
            maintenances: {
              create: {
                type: 'Troca de óleo',
                description: 'Validação de persistência',
                serviceDate: new Date('2026-10-01'),
                odometerKm: 45000,
                costCents: 25050,
              },
            },

          },
        },
      },
      include: {
        vehicles: {
          include: {
            maintenances: true,
          },
        },
      },
    });

    const stored = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        vehicles: {
          include: {
            maintenances: true,
          },
        },
      },
    });

    expect(stored).not.toBeNull();
    expect(stored?.email).toBe(email);
    expect(stored?.vehicles).toHaveLength(1);
    expect(stored?.vehicles[0]?.brand).toBe('Toyota');
    expect(stored?.vehicles[0]?.maintenances).toHaveLength(1);
    expect(stored?.vehicles[0]?.maintenances[0]?.type).toBe('Troca de óleo');
    expect(stored?.vehicles[0]?.maintenances[0]?.costCents).toBe(25050);

    await prisma.user.delete({ where: { id: user.id } });

    const deleted = await prisma.user.findUnique({ where: { id: user.id } });
    expect(deleted).toBeNull();
  });
});
