import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'motorista@autotrack.app',
    description: 'E-mail único do usuário',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: 'João Silva',
    description: 'Nome de exibição',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;
}
