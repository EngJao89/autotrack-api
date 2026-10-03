import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Verifica se a API está disponível' })
  @ApiOkResponse({
    description: 'API saudável',
    type: HealthResponseDto,
  })
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      service: 'autotrack-api',
      version: 'v1',
      timestamp: new Date().toISOString(),
    };
  }
}
