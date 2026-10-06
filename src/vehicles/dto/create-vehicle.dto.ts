import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { getVehicleYearMax, VEHICLE_YEAR_MIN } from '../vehicles.constants';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateVehicleDto {
  @ApiProperty({ example: 'Toyota' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  brand!: string;

  @ApiProperty({ example: 'Corolla' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  model!: string;

  @ApiPropertyOptional({ example: 'XEi 2.0' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(80)
  version?: string;

  @ApiProperty({ example: 2022, minimum: VEHICLE_YEAR_MIN })
  @Type(() => Number)
  @IsInt()
  @Min(VEHICLE_YEAR_MIN)
  @Max(getVehicleYearMax())
  year!: number;

  @ApiPropertyOptional({ example: 'ABC1D23' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(10)
  licensePlate?: string;

  @ApiPropertyOptional({ example: 'Prata' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(40)
  color?: string;

  @ApiPropertyOptional({ example: 'flex' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MaxLength(30)
  fuelType?: string;

  @ApiPropertyOptional({ example: 45000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odometerKm?: number;
}
