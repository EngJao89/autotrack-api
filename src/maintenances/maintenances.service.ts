import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { ListMaintenancesQueryDto } from './dto/list-maintenances.query.dto';
import { MaintenanceResponseDto } from './dto/maintenance-response.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';

@Injectable()
export class MaintenancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async createForVehicle(
    userId: string,
    vehicleId: string,
    dto: CreateMaintenanceDto,
  ): Promise<MaintenanceResponseDto> {
    await this.vehiclesService.findOneForUser(userId, vehicleId);

    return this.prisma.maintenance.create({
      data: {
        vehicleId,
        type: dto.type,
        description: dto.description,
        serviceDate: new Date(dto.serviceDate),
        odometerKm: dto.odometerKm,
        costCents: dto.costCents,
        workshopName: dto.workshopName,
        notes: dto.notes,
      },
    });
  }

  async findAllForVehicle(
    userId: string,
    vehicleId: string,
    query: ListMaintenancesQueryDto,
  ): Promise<MaintenanceResponseDto[]> {
    await this.vehiclesService.findOneForUser(userId, vehicleId);

    return this.prisma.maintenance.findMany({
      where: this.buildListWhere(vehicleId, query),
      orderBy: { serviceDate: 'desc' },
    });
  }

  async findOneForUser(
    userId: string,
    id: string,
  ): Promise<MaintenanceResponseDto> {
    return this.findOwnedOrThrow(userId, id);
  }

  async updateForUser(
    userId: string,
    id: string,
    dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceResponseDto> {
    await this.findOwnedOrThrow(userId, id);

    return this.prisma.maintenance.update({
      where: { id },
      data: {
        type: dto.type,
        description: dto.description,
        serviceDate:
          dto.serviceDate !== undefined
            ? new Date(dto.serviceDate)
            : undefined,
        odometerKm: dto.odometerKm,
        costCents: dto.costCents,
        workshopName: dto.workshopName,
        notes: dto.notes,
      },
    });
  }

  async removeForUser(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.maintenance.delete({ where: { id } });
  }

  private buildListWhere(
    vehicleId: string,
    query: ListMaintenancesQueryDto,
  ): Prisma.MaintenanceWhereInput {
    const serviceDateFilter: Prisma.DateTimeFilter = {};
    if (query.startDate) {
      serviceDateFilter.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      serviceDateFilter.lte = new Date(query.endDate);
    }

    const odometerFilter: Prisma.IntNullableFilter = {};
    if (query.odometerMin !== undefined) {
      odometerFilter.gte = query.odometerMin;
    }
    if (query.odometerMax !== undefined) {
      odometerFilter.lte = query.odometerMax;
    }

    return {
      vehicleId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.startDate || query.endDate
        ? { serviceDate: serviceDateFilter }
        : {}),
      ...(query.odometerMin !== undefined || query.odometerMax !== undefined
        ? { odometerKm: odometerFilter }
        : {}),
    };
  }

  private async findOwnedOrThrow(
    userId: string,
    id: string,
  ): Promise<MaintenanceResponseDto> {
    const maintenance = await this.prisma.maintenance.findFirst({
      where: {
        id,
        vehicle: { userId },
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance not found');
    }

    return maintenance;
  }
}
