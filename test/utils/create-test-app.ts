import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { createValidationPipe } from '../../src/common/validation/create-validation-pipe';

export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  moduleFixture: TestingModule;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(createValidationPipe());
  await app.init();

  return { app, moduleFixture };
}
