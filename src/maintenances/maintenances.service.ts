import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { ListMaintenancesQueryDto } from './dto/list-maintenances.query.dto';
import { MaintenanceResponseDto } from './dto/maintenance-response.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import {
  MAINTENANCE_STATUS_TRANSITIONS,
  type MaintenanceStatusValue,
} from './maintenance.constants';

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
        status: dto.status ?? 'TODO',
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
      where: this.buildListWhere({ vehicleId, userId: undefined }, query),
      orderBy: this.buildOrderBy(query.status),
    });
  }

  /**
   * Lista manutenções de todos os veículos do usuário (ou um vehicleId).
   * Evita contagens de kanban sobre páginas incompletas por veículo.
   */
  async findAllForUser(
    userId: string,
    query: ListMaintenancesQueryDto,
  ): Promise<MaintenanceResponseDto[]> {
    if (query.vehicleId) {
      await this.vehiclesService.findOneForUser(userId, query.vehicleId);
    }

    return this.prisma.maintenance.findMany({
      where: this.buildListWhere(
        { vehicleId: query.vehicleId, userId },
        query,
      ),
      orderBy: this.buildOrderBy(query.status),
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
    const current = await this.findOwnedOrThrow(userId, id);

    if (dto.status !== undefined && dto.status !== current.status) {
      this.assertStatusTransition(
        current.status as MaintenanceStatusValue,
        dto.status as MaintenanceStatusValue,
      );
    }

    return this.prisma.maintenance.update({
      where: { id },
      data: {
        type: dto.type,
        status: dto.status,
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

  private assertStatusTransition(
    from: MaintenanceStatusValue,
    to: MaintenanceStatusValue,
  ): void {
    const allowed = MAINTENANCE_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Transição de status não permitida: ${from} → ${to}`,
      });
    }
  }

  private buildOrderBy(
    status?: string,
  ): Prisma.MaintenanceOrderByWithRelationInput[] {
    // DONE: conclusion/service date descending; open items: planned date ascending.
    if (status === 'DONE') {
      return [{ serviceDate: 'desc' }, { id: 'asc' }];
    }
    if (status === 'TODO' || status === 'IN_PROGRESS') {
      return [{ serviceDate: 'asc' }, { id: 'asc' }];
    }
    return [{ serviceDate: 'desc' }, { id: 'asc' }];
  }

  private buildListWhere(
    scope: { vehicleId?: string; userId?: string },
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
      ...(scope.vehicleId ? { vehicleId: scope.vehicleId } : {}),
      ...(scope.userId ? { vehicle: { userId: scope.userId } } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
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
