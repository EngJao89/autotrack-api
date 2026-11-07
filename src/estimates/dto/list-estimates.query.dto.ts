import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { REPAIR_ESTIMATE_STATUSES } from '../estimate.constants';

export class ListEstimatesQueryDto {
  @ApiPropertyOptional({
    enum: REPAIR_ESTIMATE_STATUSES,
    description: 'Filtro por status do orçamento',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsIn([...REPAIR_ESTIMATE_STATUSES])
  status?: (typeof REPAIR_ESTIMATE_STATUSES)[number];

  @ApiPropertyOptional({
    example: 'clxvehicle123',
    description:
      'Quando usado em GET /v1/estimates, restringe ao veículo do usuário',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  vehicleId?: string;
}
