import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  REPAIR_ESTIMATE_MAX_ITEMS,
  REPAIR_ESTIMATE_STATUSES,
} from '../estimate.constants';
import { EstimateItemInputDto } from './estimate-item.dto';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Content fields (title, description, items) only apply when status is DRAFT.
 * Status transitions follow REPAIR_ESTIMATE_STATUS_TRANSITIONS.
 */
export class UpdateEstimateDto {
  @ApiPropertyOptional({ example: 'Troca de embreagem', maxLength: 120 })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({
    example: 'Orçamento oficina centro',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    enum: REPAIR_ESTIMATE_STATUSES,
    description: 'Transição de status (ATP-38)',
  })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @IsIn([...REPAIR_ESTIMATE_STATUSES])
  status?: (typeof REPAIR_ESTIMATE_STATUSES)[number];

  @ApiPropertyOptional({
    type: [EstimateItemInputDto],
    minItems: 1,
    maxItems: REPAIR_ESTIMATE_MAX_ITEMS,
    description: 'Replace completo dos itens (só em DRAFT)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(REPAIR_ESTIMATE_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => EstimateItemInputDto)
  items?: EstimateItemInputDto[];
}
