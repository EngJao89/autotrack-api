import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MAINTENANCE_TYPES } from '../maintenance.constants';

export class ListMaintenancesQueryDto {
  @ApiPropertyOptional({ enum: MAINTENANCE_TYPES })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsIn([...MAINTENANCE_TYPES])
  type?: string;

  @ApiPropertyOptional({
    example: '2026-01-01T00:00:00.000Z',
    description: 'Data inicial do filtro (serviceDate >= startDate)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-12-31T23:59:59.999Z',
    description: 'Data final do filtro (serviceDate <= endDate)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 10000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odometerMin?: number;

  @ApiPropertyOptional({ example: 60000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odometerMax?: number;
}
