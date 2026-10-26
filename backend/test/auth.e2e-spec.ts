import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, registerUser, resetDatabase } from './utils';

// contracts/auth.md · US1 · FR-001, FR-002, FR-003
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('crea la cuenta (201), normaliza el email y no expone el hash', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({
          email: '  Ana@Example.com ',
          password: 'secreto123',
          timezone: 'America/La_Paz',
        })
        .expect(201);

      const body = res.body as Record<string, unknown> & {
        user: Record<string, unknown>;
      };
      expect(typeof body.accessToken).toBe('string');
      expect(body.user).toMatchObject({
        email: 'ana@example.com',
        timezone: 'America/La_Paz',
      });
      expect(body.user.id).toEqual(expect.any(String));
      expect(body.user).not.toHaveProperty('passwordHash');
    });

    it('usa UTC si no se envía zona horaria', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ email: 'utc@example.com', password: 'secreto123' })
        .expect(201);
      expect((res.body as { user: { timezone: string } }).user.timezone).toBe(
        'UTC',
      );
    });

    it('rechaza un email ya registrado con 409 EMAIL_TAKEN', async () => {
      await registerUser(app, 'ana@example.com');
      const res = await http()
        .post('/api/auth/register')
        .send({ email: 'ANA@example.com', password: 'otraClave1' })
        .expect(409);
      expect(res.body).toMatchObject({ code: 'EMAIL_TAKEN' });
    });

    it.each([
      [{ email: 'no-es-email', password: 'secreto123' }],
      [{ email: 'ana@example.com', password: 'corta' }],
      [{ email: 'ana@example.com', password: 'x'.repeat(73) }],
      [
        {
          email: 'ana@example.com',
          password: 'secreto123',
          timezone: 'Mars/Olympus',
        },
      ],
      [{ password: 'secreto123' }],
    ])('rechaza datos inválidos con 400: %j', async (payload) => {
      await http().post('/api/auth/register').send(payload).expect(400);
    });

    it('rechaza campos desconocidos con 400 y mensaje en español', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({
          email: 'ana@example.com',
          password: 'secreto123',
          role: 'admin',
        })
        .expect(400);
      expect((res.body as { message: string[] }).message).toContain(
        'El campo role no está permitido',
      );
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await registerUser(app, 'ana@example.com', 'secreto123');
    });

    it('devuelve 200 con token y usuario', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ email: 'Ana@Example.com', password: 'secreto123' })
        .expect(200);
      const body = res.body as { accessToken: unknown; user: unknown };
      expect(typeof body.accessToken).toBe('string');
      expect(body.user).toMatchObject({ email: 'ana@example.com' });
    });

    it('responde el mismo 401 genérico con contraseña incorrecta o email inexistente', async () => {
      const wrongPassword = await http()
        .post('/api/auth/login')
        .send({ email: 'ana@example.com', password: 'incorrecta' })
        .expect(401);
      const unknownEmail = await http()
        .post('/api/auth/login')
        .send({ email: 'nadie@example.com', password: 'secreto123' })
        .expect(401);
      expect(wrongPassword.body).toMatchObject({
        message: 'Credenciales inválidas',
      });
      expect(unknownEmail.body).toEqual(wrongPassword.body);
    });
  });

  describe('GET /api/auth/me', () => {
    it('devuelve el usuario del token', async () => {
      const { token } = await registerUser(app, 'ana@example.com');
      const res = await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toMatchObject({ email: 'ana@example.com' });
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('cada usuario solo ve sus propios datos', async () => {
      await registerUser(app, 'ana@example.com');
      const { token: tokenB } = await registerUser(app, 'beto@example.com');
      const res = await http()
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect(res.body).toMatchObject({ email: 'beto@example.com' });
    });

    it('responde 401 sin token o con un token inválido', async () => {
      await http().get('/api/auth/me').expect(401);
      await http()
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token-falso')
        .expect(401);
    });
  });
});
