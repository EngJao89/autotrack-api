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
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { EstimateResponseDto } from './dto/estimate-response.dto';
import { ListEstimatesQueryDto } from './dto/list-estimates.query.dto';
import { EstimatesService } from './estimates.service';

@ApiTags('Estimates')
@ApiHeader({
  name: 'X-User-Id',
  description:
    'Adapter local de desenvolvimento (desabilitado em production). Informe o id de um User existente.',
  required: true,
})
@ApiUnauthorizedResponse({ type: HttpErrorResponseDto })
@UseGuards(UserContextGuard)
@Controller('vehicles/:vehicleId/estimates')
export class VehicleEstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria um orçamento de reparo para o veículo',
    description:
      'Entra como DRAFT. totalCents é calculado no backend a partir dos itens. ' +
      'Não cria Maintenance automaticamente (ATP-38).',
  })
  @ApiCreatedResponse({ type: EstimateResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  create(
    @CurrentUserId() userId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: CreateEstimateDto,
  ): Promise<EstimateResponseDto> {
    return this.estimatesService.createForVehicle(userId, vehicleId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista orçamentos do veículo',
    description: 'Ordenação: updatedAt desc. Filtro opcional por status.',
  })
  @ApiOkResponse({ type: EstimateResponseDto, isArray: true })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  findAll(
    @CurrentUserId() userId: string,
    @Param('vehicleId') vehicleId: string,
    @Query() query: ListEstimatesQueryDto,
  ): Promise<EstimateResponseDto[]> {
    return this.estimatesService.findAllForVehicle(userId, vehicleId, query);
  }
}
