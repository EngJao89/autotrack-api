import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AuthErrorResponseDto } from '../auth/dto/auth-error.dto';
import { AuthUserResponseDto } from '../auth/dto/auth-user.dto';
import { BootstrapResponseDto } from '../auth/dto/bootstrap-response.dto';
import { HttpErrorResponseDto } from '../common/dto/http-error.dto';
import { ValidationErrorResponseDto } from '../common/dto/validation-error.dto';
import { CreateMaintenanceDto } from '../maintenances/dto/create-maintenance.dto';
import { MaintenanceResponseDto } from '../maintenances/dto/maintenance-response.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { PutUserDto } from '../users/dto/put-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { CreateVehicleDto } from '../vehicles/dto/create-vehicle.dto';
import { VehicleResponseDto } from '../vehicles/dto/vehicle-response.dto';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AutoTrack API')
    .setDescription(
      'API REST do AutoTrack para gestão de usuários, veículos e manutenções. ' +
        'Contrato público versionado em `/v1`. Mudanças incompatíveis serão planejadas em `/v2`.\n\n' +
        'Autenticação: Firebase ID Token no header `Authorization: Bearer <token>`.\n\n' +
        'Fluxo de identidade: o app autentica no Firebase (Google ou e-mail/senha), ' +
        'chama `POST /v1/auth/bootstrap` na primeira sessão e usa `GET /v1/users/me` / recursos com Bearer.\n\n' +
        'Validação global: `whitelist` + `forbidNonWhitelisted` + `transform`.\n' +
        'Erros seguem o contrato `{ statusCode, code, message, errors?, requestId }`.\n\n' +
        'Erros comuns:\n' +
        '- `400` `VALIDATION_ERROR` (`ValidationErrorResponseDto`)\n' +
        '- `401` token ausente/inválido (`AuthErrorResponseDto`)\n' +
        '- `404` `NOT_FOUND` (`HttpErrorResponseDto`)\n' +
        '- `409` `CONFLICT`\n' +
        '- `500` `INTERNAL_ERROR` (sem stack/SQL/segredos)',
    )
    .setVersion('v1')
    .setContact('AutoTrack', 'https://github.com/EngJao89/autotrack-api', '')
    .addTag('Auth', 'Autenticação Firebase e bootstrap de perfil')
    .addTag('Users', 'Usuários')
    .addTag('Vehicles', 'Veículos')
    .addTag('Maintenance', 'Manutenções')
    .addTag('Health', 'Saúde da aplicação')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Firebase ID Token (Google ou e-mail/senha). Use Authorize e cole o token.',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ValidationErrorResponseDto,
      HttpErrorResponseDto,
      AuthErrorResponseDto,
      AuthUserResponseDto,
      BootstrapResponseDto,
      CreateUserDto,
      PutUserDto,
      UpdateUserDto,
      UserResponseDto,
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
