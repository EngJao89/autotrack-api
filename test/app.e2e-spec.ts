import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './helpers/create-test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const setup = await createTestApp();
    app = setup.app;
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /v1 returns hello world', () => {
    return request(app.getHttpServer())
      .get('/v1')
      .expect(200)
      .expect('Hello World!');
  });

  it('GET /v1/health reports database up', () => {
    return request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.info.database.status).toBe('up');
        expect(res.body.error).toEqual({});
        expect(res.body.details.database.status).toBe('up');
      });
  });
});
