import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { MaintenancesService } from './maintenances.service';

describe('MaintenancesService', () => {
  let service: MaintenancesService;
  let prisma: {
    maintenance: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let vehiclesService: {
    findOneForUser: jest.Mock;
  };

  const maintenance = {
    id: 'maint_1',
    vehicleId: 'vehicle_1',
    type: 'Troca de óleo',
    description: 'Troca de óleo e filtro',
    serviceDate: new Date('2026-10-03T00:00:00.000Z'),
    odometerKm: 45000,
    costCents: 18990,
    workshopName: 'Oficina AutoTrack',
    notes: 'Próxima troca em 10.000 km',
    createdAt: new Date('2026-10-06T20:00:00.000Z'),
    updatedAt: new Date('2026-10-06T20:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      maintenance: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    vehiclesService = {
      findOneForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenancesService,
        { provide: PrismaService, useValue: prisma },
        { provide: VehiclesService, useValue: vehiclesService },
      ],
    }).compile();

    service = module.get(MaintenancesService);
  });

  it('creates a maintenance for an owned vehicle', async () => {
    vehiclesService.findOneForUser.mockResolvedValue({ id: 'vehicle_1' });
    prisma.maintenance.create.mockResolvedValue(maintenance);

    const result = await service.createForVehicle('user_1', 'vehicle_1', {
      type: 'Troca de óleo',
      description: 'Troca de óleo e filtro',
      serviceDate: '2026-10-03T00:00:00.000Z',
      odometerKm: 45000,
      costCents: 18990,
      workshopName: 'Oficina AutoTrack',
      notes: 'Próxima troca em 10.000 km',
    });

    expect(vehiclesService.findOneForUser.mock.calls).toEqual([
      ['user_1', 'vehicle_1'],
    ]);
    expect(prisma.maintenance.create).toHaveBeenCalledWith({
      data: {
        vehicleId: 'vehicle_1',
        type: 'Troca de óleo',
        description: 'Troca de óleo e filtro',
        serviceDate: new Date('2026-10-03T00:00:00.000Z'),
        odometerKm: 45000,
        costCents: 18990,
        workshopName: 'Oficina AutoTrack',
        notes: 'Próxima troca em 10.000 km',
      },
    });
    expect(result).toEqual(maintenance);
  });

  it('lists maintenances with filters ordered by serviceDate desc', async () => {
    vehiclesService.findOneForUser.mockResolvedValue({ id: 'vehicle_1' });
    prisma.maintenance.findMany.mockResolvedValue([maintenance]);

    await expect(
      service.findAllForVehicle('user_1', 'vehicle_1', {
        type: 'Troca de óleo',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.999Z',
        odometerMin: 10000,
        odometerMax: 60000,
      }),
    ).resolves.toEqual([maintenance]);

    expect(prisma.maintenance.findMany).toHaveBeenCalledWith({
      where: {
        vehicleId: 'vehicle_1',
        type: 'Troca de óleo',
        serviceDate: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-12-31T23:59:59.999Z'),
        },
        odometerKm: {
          gte: 10000,
          lte: 60000,
        },
      },
      orderBy: { serviceDate: 'desc' },
    });
  });

  it('hides maintenances from other users as not found', async () => {
    prisma.maintenance.findFirst.mockResolvedValue(null);

    await expect(
      service.findOneForUser('user_2', 'maint_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an owned maintenance without changing vehicleId', async () => {
    prisma.maintenance.findFirst.mockResolvedValue(maintenance);
    prisma.maintenance.update.mockResolvedValue({
      ...maintenance,
      notes: 'Atualizado',
    });

    const result = await service.updateForUser('user_1', 'maint_1', {
      notes: 'Atualizado',
    });

    expect(prisma.maintenance.update).toHaveBeenCalledWith({
      where: { id: 'maint_1' },
      data: {
        type: undefined,
        description: undefined,
        serviceDate: undefined,
        odometerKm: undefined,
        costCents: undefined,
        workshopName: undefined,
        notes: 'Atualizado',
      },
    });
    expect(result.vehicleId).toBe('vehicle_1');
  });

  it('deletes an owned maintenance', async () => {
    prisma.maintenance.findFirst.mockResolvedValue(maintenance);
    prisma.maintenance.delete.mockResolvedValue(maintenance);

    await expect(
      service.removeForUser('user_1', 'maint_1'),
    ).resolves.toBeUndefined();
    expect(prisma.maintenance.delete).toHaveBeenCalledWith({
      where: { id: 'maint_1' },
    });
  });

  it('propagates vehicle not found on create', async () => {
    vehiclesService.findOneForUser.mockRejectedValue(
      new NotFoundException('Vehicle not found'),
    );

    await expect(
      service.createForVehicle('user_1', 'missing', {
        type: 'Preventiva',
        serviceDate: '2026-10-03T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
