import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  REPAIR_ESTIMATE_CURRENCY,
  REPAIR_ESTIMATE_STATUSES,
} from '../estimate.constants';
import { EstimateItemResponseDto } from './estimate-item.dto';

export class EstimateResponseDto {
  @ApiProperty({ example: 'clxestimate123' })
  id!: string;

  @ApiProperty({ example: 'clxvehicle123' })
  vehicleId!: string;

  @ApiProperty({ example: 'Troca de embreagem' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Orçamento oficina centro',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ example: REPAIR_ESTIMATE_CURRENCY })
  currency!: string;

  @ApiProperty({
    example: 'DRAFT',
    enum: REPAIR_ESTIMATE_STATUSES,
  })
  status!: (typeof REPAIR_ESTIMATE_STATUSES)[number];

  @ApiProperty({
    example: 124000,
    description: 'Soma dos lineTotalCents (calculado no backend)',
  })
  totalCents!: number;

  @ApiProperty({ type: [EstimateItemResponseDto] })
  items!: EstimateItemResponseDto[];

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  updatedAt!: Date;
}
