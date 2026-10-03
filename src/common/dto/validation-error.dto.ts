import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({
    type: [ValidationErrorItemDto],
    description: 'Lista de erros de validação por campo',
  })
  details!: ValidationErrorItemDto[];
}
