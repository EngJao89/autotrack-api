import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { FIREBASE_TOKEN_VERIFIER } from '../../src/auth/auth.constants';
import type { FirebaseTokenVerifier } from '../../src/auth/interfaces/firebase-token-verifier';
import { createValidationPipe } from '../../src/common/validation/create-validation-pipe';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createFirebaseTokenVerifierMock } from './auth';
import { resetDatabase } from './database';

export interface CreateTestAppOptions {
  firebaseVerifier?: FirebaseTokenVerifier;
  resetDb?: boolean;
}

export async function createTestApp(
  options: CreateTestAppOptions = {},
): Promise<{
  app: INestApplication<App>;
  moduleFixture: TestingModule;
  prisma: PrismaService;
}> {
  const firebaseVerifier =
    options.firebaseVerifier ?? createFirebaseTokenVerifierMock();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(FIREBASE_TOKEN_VERIFIER)
    .useValue(firebaseVerifier)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(createValidationPipe());
  await app.init();

  const prisma = app.get(PrismaService);
  if (options.resetDb !== false) {
    await resetDatabase(prisma);
  }

  return { app, moduleFixture, prisma };
}
