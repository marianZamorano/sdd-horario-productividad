import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp } from './utils';

describe('GET /api/health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 sin token', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('aplica CORS solo a los orígenes permitidos', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );

    const denied = await request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'https://evil.com');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
