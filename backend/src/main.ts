import { config } from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

// En local, backend/.env manda sobre variables globales del sistema (p. ej. un DATABASE_URL de
// otro proyecto). En Vercel no existe .env y se usan sus variables de entorno.
config({ override: true, quiet: true });

// Entrypoint detectado por Vercel (research R1): toda la app corre como una Vercel Function.
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
