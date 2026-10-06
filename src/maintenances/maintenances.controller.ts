import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
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
import { MaintenanceResponseDto } from './dto/maintenance-response.dto';
import { UpdateMaintenanceDto } from './dto/update-maintenance.dto';
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
@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Busca uma manutenção pelo id',
    description: 'Somente se o veículo relacionado pertencer ao usuário atual.',
  })
  @ApiOkResponse({ type: MaintenanceResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  findOne(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<MaintenanceResponseDto> {
    return this.maintenancesService.findOneForUser(userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza uma manutenção',
    description: 'Não permite alterar vehicleId, id, createdAt ou updatedAt.',
  })
  @ApiOkResponse({ type: MaintenanceResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
  ): Promise<MaintenanceResponseDto> {
    return this.maintenancesService.updateForUser(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma manutenção' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  async remove(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.maintenancesService.removeForUser(userId, id);
  }
}
