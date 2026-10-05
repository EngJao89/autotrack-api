import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'clx123abc' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiPropertyOptional({ example: 'Example User', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '2026-10-05T20:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-10-05T20:00:00.000Z' })
  updatedAt!: Date;
}
