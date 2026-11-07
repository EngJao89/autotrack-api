import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { EstimateResponseDto } from './dto/estimate-response.dto';
import { ListEstimatesQueryDto } from './dto/list-estimates.query.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { computeEstimateItems } from './estimate-totals';
import {
  REPAIR_ESTIMATE_CURRENCY,
  REPAIR_ESTIMATE_STATUS_TRANSITIONS,
  type RepairEstimateStatusValue,
} from './estimate.constants';

const estimateInclude = {
  items: { orderBy: [{ sortOrder: 'asc' as const }, { id: 'asc' as const }] },
} satisfies Prisma.RepairEstimateInclude;

type EstimateWithItems = Prisma.RepairEstimateGetPayload<{
  include: typeof estimateInclude;
}>;

@Injectable()
export class EstimatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vehiclesService: VehiclesService,
  ) {}

  async createForVehicle(
    userId: string,
    vehicleId: string,
    dto: CreateEstimateDto,
  ): Promise<EstimateResponseDto> {
    await this.vehiclesService.findOneForUser(userId, vehicleId);
    const { lines, totalCents } = computeEstimateItems(dto.items);

    const created = await this.prisma.$transaction(async (tx) => {
      const estimate = await tx.repairEstimate.create({
        data: {
          vehicleId,
          title: dto.title,
          description: dto.description,
          currency: REPAIR_ESTIMATE_CURRENCY,
          status: 'DRAFT',
          totalCents,
          items: {
            create: lines.map((line) => ({
              description: line.description,
              category: line.category,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
              lineTotalCents: line.lineTotalCents,
              sortOrder: line.sortOrder,
            })),
          },
        },
        include: estimateInclude,
      });
      return estimate;
    });

    return this.toResponse(created);
  }

  async findAllForVehicle(
    userId: string,
    vehicleId: string,
    query: ListEstimatesQueryDto,
  ): Promise<EstimateResponseDto[]> {
    await this.vehiclesService.findOneForUser(userId, vehicleId);
    const rows = await this.prisma.repairEstimate.findMany({
      where: this.buildListWhere({ vehicleId }, query),
      include: estimateInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toResponse(row));
  }

  async findAllForUser(
    userId: string,
    query: ListEstimatesQueryDto,
  ): Promise<EstimateResponseDto[]> {
    if (query.vehicleId) {
      await this.vehiclesService.findOneForUser(userId, query.vehicleId);
    }

    const rows = await this.prisma.repairEstimate.findMany({
      where: this.buildListWhere(
        { vehicleId: query.vehicleId, userId },
        query,
      ),
      include: estimateInclude,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    });
    return rows.map((row) => this.toResponse(row));
  }

  async findOneForUser(
    userId: string,
    id: string,
  ): Promise<EstimateResponseDto> {
    return this.toResponse(await this.findOwnedOrThrow(userId, id));
  }

  async updateForUser(
    userId: string,
    id: string,
    dto: UpdateEstimateDto,
  ): Promise<EstimateResponseDto> {
    const current = await this.findOwnedOrThrow(userId, id);
    const contentChange =
      dto.title !== undefined ||
      dto.description !== undefined ||
      dto.items !== undefined;

    if (contentChange && current.status !== 'DRAFT') {
      throw new BadRequestException({
        code: 'ESTIMATE_NOT_EDITABLE',
        message:
          'Conteúdo do orçamento só pode ser editado com status DRAFT. Reabra o orçamento antes de alterar.',
      });
    }

    if (dto.status !== undefined && dto.status !== current.status) {
      this.assertStatusTransition(
        current.status as RepairEstimateStatusValue,
        dto.status as RepairEstimateStatusValue,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        const { lines, totalCents } = computeEstimateItems(dto.items);
        await tx.repairEstimateItem.deleteMany({ where: { estimateId: id } });
        await tx.repairEstimateItem.createMany({
          data: lines.map((line) => ({
            estimateId: id,
            description: line.description,
            category: line.category,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            lineTotalCents: line.lineTotalCents,
            sortOrder: line.sortOrder,
          })),
        });
        return tx.repairEstimate.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description,
            status: dto.status,
            totalCents,
          },
          include: estimateInclude,
        });
      }

      return tx.repairEstimate.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          status: dto.status,
        },
        include: estimateInclude,
      });
    });

    return this.toResponse(updated);
  }

  async removeForUser(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.repairEstimate.delete({ where: { id } });
  }

  private assertStatusTransition(
    from: RepairEstimateStatusValue,
    to: RepairEstimateStatusValue,
  ): void {
    const allowed = REPAIR_ESTIMATE_STATUS_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException({
        code: 'INVALID_STATUS_TRANSITION',
        message: `Transição de status não permitida: ${from} → ${to}`,
      });
    }
  }

  private buildListWhere(
    scope: { vehicleId?: string; userId?: string },
    query: ListEstimatesQueryDto,
  ): Prisma.RepairEstimateWhereInput {
    return {
      ...(scope.vehicleId ? { vehicleId: scope.vehicleId } : {}),
      ...(scope.userId ? { vehicle: { userId: scope.userId } } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
  }

  private async findOwnedOrThrow(
    userId: string,
    id: string,
  ): Promise<EstimateWithItems> {
    const estimate = await this.prisma.repairEstimate.findFirst({
      where: {
        id,
        vehicle: { userId },
      },
      include: estimateInclude,
    });

    if (!estimate) {
      throw new NotFoundException('Repair estimate not found');
    }

    return estimate;
  }

  private toResponse(row: EstimateWithItems): EstimateResponseDto {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      title: row.title,
      description: row.description,
      currency: row.currency,
      status: row.status,
      totalCents: row.totalCents,
      items: row.items.map((item) => ({
        id: item.id,
        estimateId: item.estimateId,
        description: item.description,
        category: item.category,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
        sortOrder: item.sortOrder,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
