import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from './vehicles.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: {
    vehicle: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const vehicle = {
    id: 'vehicle_1',
    userId: 'user_1',
    brand: 'Toyota',
    model: 'Corolla',
    version: 'XEi 2.0',
    year: 2022,
    licensePlate: 'ABC1D23',
    color: 'Prata',
    fuelType: 'flex',
    odometerKm: 45000,
    createdAt: new Date('2026-10-06T20:00:00.000Z'),
    updatedAt: new Date('2026-10-06T20:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      vehicle: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(VehiclesService);
  });

  it('creates a vehicle for the given user', async () => {
    prisma.vehicle.create.mockResolvedValue(vehicle);

    const result = await service.create('user_1', {
      brand: 'Toyota',
      model: 'Corolla',
      version: 'XEi 2.0',
      year: 2022,
      licensePlate: 'ABC1D23',
      color: 'Prata',
      fuelType: 'flex',
      odometerKm: 45000,
    });

    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        brand: 'Toyota',
        model: 'Corolla',
        version: 'XEi 2.0',
        year: 2022,
        licensePlate: 'ABC1D23',
        color: 'Prata',
        fuelType: 'flex',
        odometerKm: 45000,
      },
    });
    expect(result).toEqual(vehicle);
  });

  it('lists only vehicles for the given user', async () => {
    prisma.vehicle.findMany.mockResolvedValue([vehicle]);

    await expect(service.findAllForUser('user_1')).resolves.toEqual([vehicle]);
    expect(prisma.vehicle.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns a vehicle owned by the user', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);

    await expect(service.findOneForUser('user_1', 'vehicle_1')).resolves.toEqual(
      vehicle,
    );
  });

  it('hides vehicles from other users as not found', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);

    await expect(
      service.findOneForUser('user_2', 'vehicle_1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates an owned vehicle without changing ownership', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.vehicle.update.mockResolvedValue({
      ...vehicle,
      color: 'Preto',
    });

    const result = await service.updateForUser('user_1', 'vehicle_1', {
      color: 'Preto',
    });

    expect(prisma.vehicle.update).toHaveBeenCalledWith({
      where: { id: 'vehicle_1' },
      data: {
        brand: undefined,
        model: undefined,
        version: undefined,
        year: undefined,
        licensePlate: undefined,
        color: 'Preto',
        fuelType: undefined,
        odometerKm: undefined,
      },
    });
    expect(result.color).toBe('Preto');
    expect(result.userId).toBe('user_1');
  });

  it('deletes an owned vehicle', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(vehicle);
    prisma.vehicle.delete.mockResolvedValue(vehicle);

    await expect(
      service.removeForUser('user_1', 'vehicle_1'),
    ).resolves.toBeUndefined();
    expect(prisma.vehicle.delete).toHaveBeenCalledWith({
      where: { id: 'vehicle_1' },
    });
  });
});
