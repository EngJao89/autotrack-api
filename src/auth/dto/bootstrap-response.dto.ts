import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class BootstrapResponseDto {
  @ApiProperty({
    example: true,
    description: 'true quando o perfil local foi criado nesta chamada',
  })
  created!: boolean;

  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}
