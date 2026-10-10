import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user';
import { HttpErrorResponseDto } from '../common/dto/http-error.dto';
import { CurrentUserId } from '../common/user-context/current-user-id.decorator';
import { UserContextGuard } from '../common/user-context/user-context.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { PutUserDto } from './dto/put-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria um usuário',
    description:
      'Bootstrap local/desenvolvimento. Não aceite senha ou secrets neste contrato. ' +
      'Em produção o app Expo deve usar POST /v1/auth/bootstrap com Bearer Firebase.',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({
    description: 'E-mail já cadastrado',
    type: HttpErrorResponseDto,
  })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Retorna o perfil local do usuário autenticado',
    description:
      'Resolve o perfil pelo firebaseUid do token. Retorna 404 se ainda não houve bootstrap.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.usersService.getMe(user.firebaseUid);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um usuário pelo id' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({
    description: 'Usuário não encontrado',
    type: HttpErrorResponseDto,
  })
  findById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @UseGuards(UserContextGuard)
  @ApiBearerAuth('bearer')
  @ApiHeader({
    name: 'X-User-Id',
    required: false,
    description:
      'Adapter local de desenvolvimento (desabilitado em production). Preferir Bearer Firebase.',
  })
  @ApiOperation({
    summary: 'Substitui o perfil do usuário (PUT)',
    description:
      'Substituição completa dos campos mutáveis (name, cnh, document, documentType, phone). ' +
      'Campos omitidos viram null. Email/id/firebaseUid/timestamps não são aceitos. Somente o próprio usuário.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
  @ApiForbiddenResponse({ type: HttpErrorResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  @ApiConflictResponse({ type: HttpErrorResponseDto })
  replace(
    @CurrentUserId() actorUserId: string,
    @Param('id') id: string,
    @Body() dto: PutUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.replaceProfile(actorUserId, id, dto);
  }

  @Patch(':id')
  @UseGuards(UserContextGuard)
  @ApiBearerAuth('bearer')
  @ApiHeader({
    name: 'X-User-Id',
    required: false,
    description:
      'Adapter local de desenvolvimento (desabilitado em production). Preferir Bearer Firebase.',
  })
  @ApiOperation({
    summary: 'Atualiza parcialmente o perfil (PATCH)',
    description:
      'Altera apenas os campos enviados. null limpa o campo. Somente o próprio usuário.',
  })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
  @ApiForbiddenResponse({ type: HttpErrorResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  @ApiConflictResponse({ type: HttpErrorResponseDto })
  update(
    @CurrentUserId() actorUserId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(actorUserId, id, dto);
  }

  @Delete(':id')
  @UseGuards(UserContextGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('bearer')
  @ApiHeader({
    name: 'X-User-Id',
    required: false,
    description:
      'Adapter local de desenvolvimento (desabilitado em production). Preferir Bearer Firebase.',
  })
  @ApiOperation({
    summary: 'Remove o usuário (DELETE físico)',
    description:
      'Exclusão física. Veículos e manutenções relacionadas são removidos por CASCADE. Somente o próprio usuário.',
  })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
  @ApiForbiddenResponse({ type: HttpErrorResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  async remove(
    @CurrentUserId() actorUserId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.usersService.removeProfile(actorUserId, id);
  }
}
