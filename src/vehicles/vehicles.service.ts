import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    return this.prisma.vehicle.create({
      data: {
        userId,
        brand: dto.brand,
        model: dto.model,
        version: dto.version,
        year: dto.year,
        licensePlate: dto.licensePlate,
        color: dto.color,
        fuelType: dto.fuelType,
        odometerKm: dto.odometerKm,
      },
    });
  }

  findAllForUser(userId: string): Promise<VehicleResponseDto[]> {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(
    userId: string,
    id: string,
  ): Promise<VehicleResponseDto> {
    return this.findOwnedOrThrow(userId, id);
  }

  async updateForUser(
    userId: string,
    id: string,
    dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    await this.findOwnedOrThrow(userId, id);

    return this.prisma.vehicle.update({
      where: { id },
      data: {
        brand: dto.brand,
        model: dto.model,
        version: dto.version,
        year: dto.year,
        licensePlate: dto.licensePlate,
        color: dto.color,
        fuelType: dto.fuelType,
        odometerKm: dto.odometerKm,
      },
    });
  }

  async removeForUser(userId: string, id: string): Promise<void> {
    await this.findOwnedOrThrow(userId, id);
    await this.prisma.vehicle.delete({ where: { id } });
  }

  private async findOwnedOrThrow(
    userId: string,
    id: string,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }
}
