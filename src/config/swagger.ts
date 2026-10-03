import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpErrorResponseDto } from '../common/dto/http-error.dto';
import { ValidationErrorResponseDto } from '../common/dto/validation-error.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('AutoTrack API')
    .setDescription(
      'API REST do AutoTrack para gestão de usuários, veículos e manutenções. ' +
        'Contrato público versionado em `/v1`. Mudanças incompatíveis serão planejadas em `/v2`.\n\n' +
        'Erros comuns:\n' +
        '- `400` validação de payload (`ValidationErrorResponseDto`)\n' +
        '- `401/403` autenticação/autorização\n' +
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
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [
      ValidationErrorResponseDto,
      HttpErrorResponseDto,
      CreateUserDto,
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
