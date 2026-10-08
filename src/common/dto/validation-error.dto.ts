import { ApiProperty } from '@nestjs/swagger';
import { API_ERROR_CODE } from '../errors/error-codes';

export class ValidationErrorItemDto {
  @ApiProperty({
    example: 'email',
    description: 'Campo que falhou na validação',
  })
  field!: string;

  @ApiProperty({
    example: ['email must be an email'],
    description: 'Mensagens de erro do campo',
    type: [String],
  })
  messages!: string[];
}

export class ValidationErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    example: API_ERROR_CODE.VALIDATION_ERROR,
    enum: [API_ERROR_CODE.VALIDATION_ERROR],
  })
  code!: string;

  @ApiProperty({ example: 'Request validation failed' })
  message!: string;

  @ApiProperty({
    type: [ValidationErrorItemDto],
    description: 'Lista de erros de validação por campo',
  })
  errors!: ValidationErrorItemDto[];

  @ApiProperty({
    example: '9f3c2b1a-4d5e-6789-abcd-ef0123456789',
    description: 'ID de correlação da requisição',
  })
  requestId!: string;
}
