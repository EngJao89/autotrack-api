import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { HttpErrorResponseDto } from '../common/dto/http-error.dto';
import { CreateUserDto } from './dto/create-user.dto';
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
      'Fluxo local/desenvolvimento até existir autenticação. Não aceite senha ou secrets neste contrato.',
  })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({
    description: 'E-mail já cadastrado',
    type: HttpErrorResponseDto,
  })
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
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
}
