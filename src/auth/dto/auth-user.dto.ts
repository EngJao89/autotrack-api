import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({
    example: 'firebase-uid-123',
    description: 'UID Firebase (alias de firebaseUid, compatível com ATP-21)',
  })
  userId!: string;

  @ApiProperty({
    example: 'firebase-uid-123',
    description: 'Identidade externa estável (Firebase UID)',
  })
  firebaseUid!: string;

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'E-mail do token Firebase, quando disponível',
  })
  email?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Se o e-mail está verificado no Firebase',
  })
  emailVerified?: boolean;

  @ApiPropertyOptional({
    example: 'clx123abc',
    description:
      'Id do perfil local quando já vinculado (ausente se ainda não houve bootstrap)',
    nullable: true,
  })
  localUserId?: string | null;
}
