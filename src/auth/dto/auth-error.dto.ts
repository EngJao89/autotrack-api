import { ApiProperty } from '@nestjs/swagger';
import { AUTH_ERROR_CODE } from '../auth.constants';

export class AuthErrorResponseDto {
  @ApiProperty({ example: 401 })
  statusCode!: number;

  @ApiProperty({
    enum: Object.values(AUTH_ERROR_CODE),
    example: AUTH_ERROR_CODE.TOKEN_MISSING,
  })
  code!: string;

  @ApiProperty({ example: 'Authentication token is required' })
  message!: string;
}
