import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HttpErrorResponseDto } from '../common/dto/http-error.dto';
import { CurrentUserId } from '../common/user-context/current-user-id.decorator';
import { UserContextGuard } from '../common/user-context/user-context.guard';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { ListMaintenancesQueryDto } from './dto/list-maintenances.query.dto';
import { MaintenanceResponseDto } from './dto/maintenance-response.dto';
import { MaintenancesService } from './maintenances.service';

@ApiTags('Maintenance')
@ApiHeader({
  name: 'X-User-Id',
  description:
    'Adapter local de desenvolvimento (desabilitado em production). Informe o id de um User existente.',
  required: true,
})
@ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
@UseGuards(UserContextGuard)
@Controller('vehicles/:vehicleId/maintenances')
export class VehicleMaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria uma manutenção para o veículo',
    description:
      'O vehicleId vem da rota. Valida se o veículo pertence ao usuário atual.',
  })
  @ApiCreatedResponse({ type: MaintenanceResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  create(
    @CurrentUserId() userId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: CreateMaintenanceDto,
  ): Promise<MaintenanceResponseDto> {
    return this.maintenancesService.createForVehicle(userId, vehicleId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista manutenções do veículo',
    description:
      'Ordenação padrão: serviceDate desc. Filtros opcionais por type, período e faixa de km.',
  })
  @ApiOkResponse({ type: MaintenanceResponseDto, isArray: true })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  findAll(
    @CurrentUserId() userId: string,
    @Param('vehicleId') vehicleId: string,
    @Query() query: ListMaintenancesQueryDto,
  ): Promise<MaintenanceResponseDto[]> {
    return this.maintenancesService.findAllForVehicle(userId, vehicleId, query);
  }
}
