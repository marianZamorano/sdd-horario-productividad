import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

/** Arranca la app con la misma configuración que `main.ts`. */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

/** Vacía todas las tablas entre tests (las relaciones caen en cascada desde User). */
export async function resetDatabase(app: INestApplication): Promise<void> {
  await app
    .get(PrismaService)
    .$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE');
}

/** Registra un usuario y devuelve su token (disponible desde US1, endpoint de auth). */
export async function registerUser(
  app: INestApplication<App>,
  email: string,
  password = 'secreto123',
  timezone = 'America/La_Paz',
): Promise<{ token: string; userId: string }> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/register')
    .send({ email, password, timezone })
    .expect(201);
  const body = res.body as { accessToken: string; user: { id: string } };
  return { token: body.accessToken, userId: body.user.id };
}
