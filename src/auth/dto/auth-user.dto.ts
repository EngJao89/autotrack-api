import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({
    example: 'firebase-uid-123',
    description: 'UID do usuário autenticado no Firebase',
  })
  userId!: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'E-mail do token Firebase, quando disponível',
  })
  email?: string;
}
