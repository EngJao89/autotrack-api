import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { REPAIR_ESTIMATE_MAX_ITEMS } from '../estimate.constants';
import { EstimateItemInputDto } from './estimate-item.dto';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateEstimateDto {
  @ApiProperty({ example: 'Troca de embreagem', maxLength: 120 })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ example: 'Orçamento oficina centro', maxLength: 500 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    type: [EstimateItemInputDto],
    minItems: 1,
    maxItems: REPAIR_ESTIMATE_MAX_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(REPAIR_ESTIMATE_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => EstimateItemInputDto)
  items!: EstimateItemInputDto[];
}
