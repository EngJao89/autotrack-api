import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthErrorResponseDto } from '../auth/dto/auth-error.dto';
import { HttpErrorResponseDto } from '../common/dto/http-error.dto';
import { ValidationErrorResponseDto } from '../common/dto/validation-error.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { CreateMaintenanceDto } from '../maintenances/dto/create-maintenance.dto';
import { MaintenanceResponseDto } from '../maintenances/dto/maintenance-response.dto';
import { CreateVehicleDto } from '../vehicles/dto/create-vehicle.dto';
import { VehicleResponseDto } from '../vehicles/dto/vehicle-response.dto';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AutoTrack API')
    .setDescription(
      'API REST do AutoTrack para gestão de usuários, veículos e manutenções. ' +
        'Contrato público versionado em `/v1`. Mudanças incompatíveis serão planejadas em `/v2`.\n\n' +
        'Autenticação: Firebase ID Token no header `Authorization: Bearer <token>`.\n\n' +
        'Erros comuns:\n' +
        '- `400` validação de payload (`ValidationErrorResponseDto`)\n' +
        '- `401` token ausente/inválido (`AuthErrorResponseDto`)\n' +
        '- `403` autenticação/autorização\n' +
        '- `404` recurso não encontrado (`HttpErrorResponseDto`)\n' +
        '- `500` erro interno',
    )
    .setVersion('v1')
    .setContact('AutoTrack', 'https://github.com/EngJao89/autotrack-api', '')
    .addTag('Auth', 'Autenticação e sessão')
    .addTag('Users', 'Usuários')
    .addTag('Vehicles', 'Veículos')
    .addTag('Maintenance', 'Manutenções')
    .addTag('Health', 'Saúde da aplicação')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Firebase ID Token',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ValidationErrorResponseDto,
      HttpErrorResponseDto,
      AuthErrorResponseDto,
      CreateUserDto,
      CreateVehicleDto,
      VehicleResponseDto,
      CreateMaintenanceDto,
      MaintenanceResponseDto,
    ],
  });

  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}

export function isSwaggerEnabled(): boolean {
  const flag = process.env.SWAGGER_ENABLED?.toLowerCase();
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}
