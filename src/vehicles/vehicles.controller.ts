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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HttpErrorResponseDto } from '../common/dto/http-error.dto';
import { CurrentUserId } from '../common/user-context/current-user-id.decorator';
import { UserContextGuard } from '../common/user-context/user-context.guard';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('Vehicles')
@ApiHeader({
  name: 'X-User-Id',
  description:
    'Adapter local de desenvolvimento (desabilitado em production). Informe o id de um User existente.',
  required: true,
})
@ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
@UseGuards(UserContextGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um veículo para o usuário atual' })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  create(
    @CurrentUserId() userId: string,
    @Body() dto: CreateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista veículos do usuário atual',
    description: 'Nunca retorna veículos de outros usuários.',
  })
  @ApiOkResponse({ type: VehicleResponseDto, isArray: true })
  findAll(@CurrentUserId() userId: string): Promise<VehicleResponseDto[]> {
    return this.vehiclesService.findAllForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Busca um veículo do usuário atual pelo id' })
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  findOne(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.findOneForUser(userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza um veículo do usuário atual',
    description: 'Não permite alterar userId, id, createdAt ou updatedAt.',
  })
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.updateForUser(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove um veículo do usuário atual',
    description:
      'Cascade remove manutenções vinculadas; não deixa relacionamentos órfãos.',
  })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  async remove(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.vehiclesService.removeForUser(userId, id);
  }
}
