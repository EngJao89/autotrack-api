import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { FIREBASE_TOKEN_VERIFIER } from '../src/auth/auth.constants';
import { API_ERROR_CODE } from '../src/common/errors/error-codes';
import { createValidationPipe } from '../src/common/validation/create-validation-pipe';
import { createFirebaseTokenVerifierMock } from './helpers/auth';

@Controller('test-errors')
class BoomController {
  @Get('boom')
  boom(): never {
    throw new Error('secret SQL SELECT token=abc stack');
  }
}

describe('API error contract (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [BoomController],
    })
      .overrideProvider(FIREBASE_TOKEN_VERIFIER)
      .useValue(createFirebaseTokenVerifierMock())
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns standardized 400 validation errors with field details and requestId', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/users')
      .set('X-Request-Id', 'client-request-123')
      .send({
        email: 'not-an-email',
        password: 'should-be-rejected',
      })
      .expect(400);

    expect(response.headers['x-request-id']).toBe('client-request-123');
    expect(response.body).toMatchObject({
      statusCode: 400,
      code: API_ERROR_CODE.VALIDATION_ERROR,
      message: 'Request validation failed',
      requestId: 'client-request-123',
    });
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          messages: expect.arrayContaining([expect.stringContaining('email')]),
        }),
        expect.objectContaining({
          field: 'password',
          messages: expect.arrayContaining([
            expect.stringContaining('property password'),
          ]),
        }),
      ]),
    );
    expect(response.body).not.toHaveProperty('stack');
    expect(response.body).not.toHaveProperty('error');
  });

  it('returns sanitized 500 responses without internal details', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/test-errors/boom')
      .expect(500);

    expect(response.body).toMatchObject({
      statusCode: 500,
      code: API_ERROR_CODE.INTERNAL_ERROR,
      message: 'Internal server error',
    });
    expect(response.body.requestId).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toMatch(
      /secret|SQL|SELECT|token=abc|stack/i,
    );
  });
});
