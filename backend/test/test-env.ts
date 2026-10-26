import { config } from 'dotenv';

// Los e2e nunca deben tocar la base de desarrollo: todas las URLs apuntan a DATABASE_URL_TEST
// (hallazgo U2 de /speckit-analyze). Lo usan setupFiles y globalSetup.
export function useTestDatabase(): void {
  config({ quiet: true });
  const testUrl = process.env.DATABASE_URL_TEST;
  if (!testUrl)
    throw new Error(
      'DATABASE_URL_TEST no está definido (ver backend/.env.example)',
    );
  process.env.DATABASE_URL = testUrl;
  process.env.DATABASE_URL_UNPOOLED = testUrl;
  process.env.JWT_SECRET ??= 'test-secret';
  process.env.CORS_ORIGIN ??= 'http://localhost:5173';
}

useTestDatabase();
