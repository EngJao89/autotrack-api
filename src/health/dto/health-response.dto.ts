import { ApiProperty } from '@nestjs/swagger';

class DatabaseHealthDto {
  @ApiProperty({ example: 'up', enum: ['up', 'down'] })
  status!: 'up' | 'down';
}

class HealthInfoDto {
  @ApiProperty({ type: DatabaseHealthDto })
  database!: DatabaseHealthDto;
}

export class HealthCheckResponseDto {
  @ApiProperty({
    example: 'ok',
    enum: ['ok', 'error'],
    description: 'Status agregado do health check',
  })
  status!: 'ok' | 'error';

  @ApiProperty({
    type: HealthInfoDto,
    description: 'Indicadores saudáveis',
    example: { database: { status: 'up' } },
  })
  info!: HealthInfoDto | Record<string, never>;

  @ApiProperty({
    type: Object,
    description: 'Indicadores com falha',
    example: {},
  })
  error!: Record<string, unknown>;

  @ApiProperty({
    type: HealthInfoDto,
    description: 'Detalhes de todos os indicadores',
    example: { database: { status: 'up' } },
  })
  details!: HealthInfoDto;
}
