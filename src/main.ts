import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation/create-validation-pipe';
import { isSwaggerEnabled, setupSwagger } from './config/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(createValidationPipe());
  app.enableShutdownHooks();

  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }

  const port = Number(process.env.PORT ?? 3333);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
