import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthErrorResponseDto } from './dto/auth-error.dto';
import { AuthUserResponseDto } from './dto/auth-user.dto';
import { AuthGuard } from './guards/auth.guard';
import type { AuthenticatedUser } from './interfaces/authenticated-user';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Retorna o usuário autenticado',
    description:
      'Valida o Firebase ID Token no header Authorization: Bearer <token> e devolve userId/claims essenciais.',
  })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ type: AuthErrorResponseDto })
  me(@CurrentUser() user: AuthenticatedUser): AuthUserResponseDto {
    return this.authService.getProfile(user);
  }
}
