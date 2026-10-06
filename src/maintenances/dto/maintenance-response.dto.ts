import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MAINTENANCE_TYPES } from '../maintenance.constants';

export class MaintenanceResponseDto {
  @ApiProperty({ example: 'clxmaint123' })
  id!: string;

  @ApiProperty({ example: 'clxvehicle123' })
  vehicleId!: string;

  @ApiProperty({ example: 'Troca de óleo', enum: MAINTENANCE_TYPES })
  type!: string;

  @ApiPropertyOptional({
    example: 'Troca de óleo e filtro',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  serviceDate!: Date;

  @ApiPropertyOptional({ example: 45000, nullable: true })
  odometerKm!: number | null;

  @ApiPropertyOptional({
    example: 18990,
    nullable: true,
    description: 'Custo em centavos',
  })
  costCents!: number | null;

  @ApiPropertyOptional({ example: 'Oficina AutoTrack', nullable: true })
  workshopName!: string | null;

  @ApiPropertyOptional({
    example: 'Próxima troca em 10.000 km',
    nullable: true,
  })
  notes!: string | null;

  @ApiProperty({ example: '2026-10-06T20:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-06T20:00:00.000Z' })
  updatedAt!: Date;
}
