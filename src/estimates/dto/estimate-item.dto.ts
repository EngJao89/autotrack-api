import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  REPAIR_ESTIMATE_ITEM_CATEGORIES,
  REPAIR_ESTIMATE_MAX_UNIT_PRICE_CENTS,
} from '../estimate.constants';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class EstimateItemInputDto {
  @ApiProperty({ example: 'Kit embreagem', maxLength: 200 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @ApiProperty({ example: 'PART', enum: REPAIR_ESTIMATE_ITEM_CATEGORIES })
  @Transform(trimString)
  @IsString()
  @IsIn([...REPAIR_ESTIMATE_ITEM_CATEGORIES])
  category!: (typeof REPAIR_ESTIMATE_ITEM_CATEGORIES)[number];

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({
    example: 89000,
    minimum: 0,
    maximum: REPAIR_ESTIMATE_MAX_UNIT_PRICE_CENTS,
    description: 'Preço unitário em centavos BRL',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(REPAIR_ESTIMATE_MAX_UNIT_PRICE_CENTS)
  unitPriceCents!: number;
}

export class EstimateItemResponseDto {
  @ApiProperty({ example: 'clxitem123' })
  id!: string;

  @ApiProperty({ example: 'clxestimate123' })
  estimateId!: string;

  @ApiProperty({ example: 'Kit embreagem' })
  description!: string;

  @ApiProperty({ example: 'PART', enum: REPAIR_ESTIMATE_ITEM_CATEGORIES })
  category!: (typeof REPAIR_ESTIMATE_ITEM_CATEGORIES)[number];

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 89000 })
  unitPriceCents!: number;

  @ApiProperty({
    example: 89000,
    description: 'quantity * unitPriceCents (calculado no backend)',
  })
  lineTotalCents!: number;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  updatedAt!: Date;
}
