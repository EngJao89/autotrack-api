import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { EstimateResponseDto } from './dto/estimate-response.dto';
import { ListEstimatesQueryDto } from './dto/list-estimates.query.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
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
@Controller('estimates')
export class EstimatesController {
  constructor(private readonly estimatesService: EstimatesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista orçamentos do usuário autenticado',
    description:
      'Escopo por ownership do veículo. Filtros opcionais: vehicleId, status.',
  })
  @ApiOkResponse({ type: EstimateResponseDto, isArray: true })
  findAll(
    @CurrentUserId() userId: string,
    @Query() query: ListEstimatesQueryDto,
  ): Promise<EstimateResponseDto[]> {
    return this.estimatesService.findAllForUser(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Busca um orçamento pelo id',
    description: 'Somente se o veículo relacionado pertencer ao usuário atual.',
  })
  @ApiOkResponse({ type: EstimateResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  findOne(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<EstimateResponseDto> {
    return this.estimatesService.findOneForUser(userId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza um orçamento',
    description:
      'Conteúdo (título, descrição, itens) só em DRAFT. ' +
      'Transições de status: DRAFT→FINALIZED|ARCHIVED; FINALIZED→DRAFT|ARCHIVED. ' +
      'Itens são replace completo; totalCents recalculado no backend.',
  })
  @ApiOkResponse({ type: EstimateResponseDto })
  @ApiBadRequestResponse({ type: HttpErrorResponseDto })
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEstimateDto,
  ): Promise<EstimateResponseDto> {
    return this.estimatesService.updateForUser(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um orçamento (hard delete)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: HttpErrorResponseDto })
  async remove(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.estimatesService.removeForUser(userId, id);
  }
}
