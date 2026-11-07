import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { EstimatesService } from './estimates.service';

describe('EstimatesService', () => {
  let service: EstimatesService;
  let prisma: {
    repairEstimate: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    repairEstimateItem: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let vehiclesService: {
    findOneForUser: jest.Mock;
  };

  const estimateRow = {
    id: 'est_1',
    vehicleId: 'vehicle_1',
    title: 'Troca de embreagem',
    description: null,
    currency: 'BRL',
    status: 'DRAFT',
    totalCents: 124000,
    createdAt: new Date('2026-11-05T00:00:00.000Z'),
    updatedAt: new Date('2026-11-05T00:00:00.000Z'),
    items: [
      {
        id: 'item_1',
        estimateId: 'est_1',
        description: 'Kit embreagem',
        category: 'PART',
        quantity: 1,
        unitPriceCents: 89000,
        lineTotalCents: 89000,
        sortOrder: 0,
        createdAt: new Date('2026-11-05T00:00:00.000Z'),
        updatedAt: new Date('2026-11-05T00:00:00.000Z'),
      },
      {
        id: 'item_2',
        estimateId: 'est_1',
        description: 'Mão de obra',
        category: 'LABOR',
        quantity: 1,
        unitPriceCents: 35000,
        lineTotalCents: 35000,
        sortOrder: 1,
        createdAt: new Date('2026-11-05T00:00:00.000Z'),
        updatedAt: new Date('2026-11-05T00:00:00.000Z'),
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      repairEstimate: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      repairEstimateItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(async (fn: (tx: typeof prisma) => unknown) =>
        fn(prisma),
      ),
    };
    vehiclesService = {
      findOneForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimatesService,
        { provide: PrismaService, useValue: prisma },
        { provide: VehiclesService, useValue: vehiclesService },
      ],
    }).compile();

    service = module.get(EstimatesService);
  });

  it('creates estimate with server-computed total for owned vehicle', async () => {
    vehiclesService.findOneForUser.mockResolvedValue({ id: 'vehicle_1' });
    prisma.repairEstimate.create.mockResolvedValue(estimateRow);

    const result = await service.createForVehicle('user_1', 'vehicle_1', {
      title: 'Troca de embreagem',
      items: [
        {
          description: 'Kit embreagem',
          category: 'PART',
          quantity: 1,
          unitPriceCents: 89000,
        },
        {
          description: 'Mão de obra',
          category: 'LABOR',
          quantity: 1,
          unitPriceCents: 35000,
        },
      ],
    });

    expect(vehiclesService.findOneForUser).toHaveBeenCalledWith(
      'user_1',
      'vehicle_1',
    );
    expect(prisma.repairEstimate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vehicleId: 'vehicle_1',
          status: 'DRAFT',
          currency: 'BRL',
          totalCents: 124000,
        }),
      }),
    );
    expect(result.totalCents).toBe(124000);
    expect(result.items).toHaveLength(2);
  });

  it('rejects content edit when not DRAFT', async () => {
    prisma.repairEstimate.findFirst.mockResolvedValue({
      ...estimateRow,
      status: 'FINALIZED',
    });

    await expect(
      service.updateForUser('user_1', 'est_1', { title: 'Novo título' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects invalid status transition from ARCHIVED', async () => {
    prisma.repairEstimate.findFirst.mockResolvedValue({
      ...estimateRow,
      status: 'ARCHIVED',
    });

    await expect(
      service.updateForUser('user_1', 'est_1', { status: 'DRAFT' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    });
  });

  it('replaces items transactionally and recalculates total', async () => {
    prisma.repairEstimate.findFirst.mockResolvedValue(estimateRow);
    prisma.repairEstimateItem.deleteMany.mockResolvedValue({ count: 2 });
    prisma.repairEstimateItem.createMany.mockResolvedValue({ count: 1 });
    prisma.repairEstimate.update.mockResolvedValue({
      ...estimateRow,
      totalCents: 5000,
      items: [
        {
          ...estimateRow.items[0],
          description: 'Peça A',
          quantity: 1,
          unitPriceCents: 5000,
          lineTotalCents: 5000,
        },
      ],
    });

    const result = await service.updateForUser('user_1', 'est_1', {
      items: [
        {
          description: 'Peça A',
          category: 'PART',
          quantity: 1,
          unitPriceCents: 5000,
        },
      ],
    });

    expect(prisma.repairEstimateItem.deleteMany).toHaveBeenCalledWith({
      where: { estimateId: 'est_1' },
    });
    expect(prisma.repairEstimateItem.createMany).toHaveBeenCalled();
    expect(prisma.repairEstimate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ totalCents: 5000 }),
      }),
    );
    expect(result.totalCents).toBe(5000);
  });

  it('returns 404 when estimate is not owned', async () => {
    prisma.repairEstimate.findFirst.mockResolvedValue(null);

    await expect(
      service.findOneForUser('user_other', 'est_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('finalizes draft via status transition', async () => {
    prisma.repairEstimate.findFirst.mockResolvedValue(estimateRow);
    prisma.repairEstimate.update.mockResolvedValue({
      ...estimateRow,
      status: 'FINALIZED',
    });

    const result = await service.updateForUser('user_1', 'est_1', {
      status: 'FINALIZED',
    });

    expect(result.status).toBe('FINALIZED');
  });
});
