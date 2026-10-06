import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MAINTENANCE_TYPES } from '../maintenance.constants';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateMaintenanceDto {
  @ApiProperty({
    example: 'Troca de óleo',
    enum: MAINTENANCE_TYPES,
  })
  @Transform(trimString)
  @IsString()
  @IsIn([...MAINTENANCE_TYPES])
  type!: string;

  @ApiPropertyOptional({ example: 'Troca de óleo e filtro' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: '2026-10-03T00:00:00.000Z' })
  @IsDateString()
  serviceDate!: string;

  @ApiPropertyOptional({ example: 45000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odometerKm?: number;

  @ApiPropertyOptional({
    example: 18990,
    minimum: 0,
    description: 'Custo em centavos (ex.: 18990 = R$ 189,90)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  costCents?: number;

  @ApiPropertyOptional({ example: 'Oficina AutoTrack' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(120)
  workshopName?: string;

  @ApiPropertyOptional({ example: 'Próxima troca em 10.000 km' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
