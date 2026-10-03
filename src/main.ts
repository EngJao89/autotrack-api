import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { isSwaggerEnabled, setupSwagger } from './config/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? 3333);
}
void bootstrap();
