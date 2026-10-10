import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HttpErrorResponseDto } from '../common/dto/http-error.dto';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthErrorResponseDto } from './dto/auth-error.dto';
import { AuthUserResponseDto } from './dto/auth-user.dto';
import { BootstrapResponseDto } from './dto/bootstrap-response.dto';
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
    summary: 'Retorna claims do token e vínculo local',
    description:
      'Valida o Firebase ID Token e devolve firebaseUid/email/emailVerified e localUserId quando o perfil já foi bootstrapped.',
  })
  @ApiOkResponse({ type: AuthUserResponseDto })
  @ApiUnauthorizedResponse({ type: AuthErrorResponseDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<AuthUserResponseDto> {
    return this.authService.getProfile(user);
  }

  @Post('bootstrap')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Cria ou sincroniza o perfil local do usuário autenticado',
    description:
      'Usa exclusivamente o firebaseUid do token verificado. ' +
      'Na primeira autenticação cria o perfil mínimo; nas seguintes sincroniza e-mail (provider data) quando seguro. ' +
      'Não aceita body — identidade vem só do Bearer token.',
  })
  @ApiOkResponse({ type: BootstrapResponseDto })
  @ApiUnauthorizedResponse({ type: AuthErrorResponseDto })
  @ApiConflictResponse({
    description: 'Colisão de e-mail com outra identidade Firebase',
    type: HttpErrorResponseDto,
  })
  bootstrap(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BootstrapResponseDto> {
    return this.authService.bootstrap(user);
  }
}
