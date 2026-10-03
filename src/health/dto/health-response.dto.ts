import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', description: 'Status da API' })
  status!: string;

  @ApiProperty({
    example: 'autotrack-api',
    description: 'Identificador do serviço',
  })
  service!: string;

  @ApiProperty({
    example: 'v1',
    description: 'Versão do contrato da API',
  })
  version!: string;

  @ApiProperty({
    example: '2026-10-02T21:00:00.000Z',
    description: 'Timestamp UTC da verificação',
  })
  timestamp!: string;
}
