import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { API_ERROR_CODE } from '../errors/error-codes';

export class HttpErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({
    example: API_ERROR_CODE.NOT_FOUND,
    description: 'Código estável para o client',
  })
  code!: string;

  @ApiProperty({
    example: 'Resource not found',
    description: 'Mensagem amigável do erro',
  })
  message!: string;

  @ApiPropertyOptional({
    example: '9f3c2b1a-4d5e-6789-abcd-ef0123456789',
    description: 'ID de correlação da requisição',
  })
  requestId!: string;
}
