import { ApiProperty } from '@nestjs/swagger';

export class HttpErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'Not Found' })
  error!: string;

  @ApiProperty({
    example: 'Resource not found',
    description: 'Mensagem amigável do erro',
  })
  message!: string;
}
