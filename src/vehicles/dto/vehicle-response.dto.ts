import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehicleResponseDto {
  @ApiProperty({ example: 'clxvehicle123' })
  id!: string;

  @ApiProperty({ example: 'clxuser123' })
  userId!: string;

  @ApiProperty({ example: 'Toyota' })
  brand!: string;

  @ApiProperty({ example: 'Corolla' })
  model!: string;

  @ApiPropertyOptional({ example: 'XEi 2.0', nullable: true })
  version!: string | null;

  @ApiProperty({ example: 2022 })
  year!: number;

  @ApiPropertyOptional({ example: 'ABC1D23', nullable: true })
  licensePlate!: string | null;

  @ApiPropertyOptional({ example: 'Prata', nullable: true })
  color!: string | null;

  @ApiPropertyOptional({ example: 'flex', nullable: true })
  fuelType!: string | null;

  @ApiPropertyOptional({ example: 45000, nullable: true })
  odometerKm!: number | null;

  @ApiProperty({ example: '2026-10-06T20:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-06T20:00:00.000Z' })
  updatedAt!: Date;
}
