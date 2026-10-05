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
            marca: 'Toyota',
            modelo: 'Corolla',
            ano: 2020,
            placa: 'ABC1D23',
            maintenances: {
              create: {
                tipo: 'Troca de óleo',
                descricao: 'Validação de persistência',
                data: new Date('2026-10-01'),
                quilometragem: 45000,
                custo: 250.5,
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
    expect(stored?.vehicles[0]?.marca).toBe('Toyota');
    expect(stored?.vehicles[0]?.maintenances).toHaveLength(1);
    expect(stored?.vehicles[0]?.maintenances[0]?.tipo).toBe('Troca de óleo');

    await prisma.user.delete({ where: { id: user.id } });

    const deleted = await prisma.user.findUnique({ where: { id: user.id } });
    expect(deleted).toBeNull();
  });
});
