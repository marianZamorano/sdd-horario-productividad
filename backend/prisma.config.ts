import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 no carga .env por sí solo (research R2). Las migraciones usan la conexión sin
// pooling de Neon; en local ambas URLs apuntan a la misma base.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
