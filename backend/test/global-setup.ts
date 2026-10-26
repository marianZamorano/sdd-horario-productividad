import { execSync } from 'node:child_process';
import { useTestDatabase } from './test-env';

// Aplica las migraciones pendientes a la base de tests (no destructivo). Cada suite vacía las
// tablas con resetDatabase() de ./utils, así que no hace falta `migrate reset`.
export default function globalSetup(): void {
  useTestDatabase();
  execSync('npx prisma migrate deploy', {
    stdio: 'ignore',
    env: process.env,
    cwd: `${__dirname}/..`,
  });
}
