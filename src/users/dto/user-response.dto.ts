import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'clx123abc' })
  id!: string;

  @ApiPropertyOptional({
    example: 'firebase-uid-123',
    nullable: true,
    description:
      'UID Firebase vinculado (somente leitura; nunca aceito em DTOs mutáveis)',
  })
  firebaseUid!: string | null;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Example User', nullable: true })
  name!: string | null;

  @ApiPropertyOptional({ example: '10000000091', nullable: true })
  cnh!: string | null;

  @ApiPropertyOptional({ example: '52998224725', nullable: true })
  document!: string | null;

  @ApiPropertyOptional({ example: 'CPF', nullable: true, enum: ['CPF', 'CNPJ'] })
  documentType!: string | null;

  @ApiPropertyOptional({ example: '+5511999999999', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: '2026-10-05T20:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-05T20:00:00.000Z' })
  updatedAt!: Date;
}
