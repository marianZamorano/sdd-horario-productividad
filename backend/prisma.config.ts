import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 no carga .env por sí solo (research R2). En local, backend/.env manda sobre
// variables globales del sistema; en Vercel no hay .env. Las migraciones usan la conexión sin
// pooling de Neon; en local ambas URLs apuntan a la misma base.
// Los e2e fijan sus URLs en el entorno del proceso (test/test-env.ts) antes de invocar a Prisma.
if (!process.env.PRISMA_SKIP_DOTENV) config({ override: true, quiet: true });
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
