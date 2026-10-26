# Contrato: workflows de GitHub Actions

Interfaz que el pipeline expone al equipo: cuándo se ejecuta cada workflow, qué jobs tiene,
qué checks aparecen en el commit y qué necesita de fuera. Decisiones en
[../research.md](../research.md) (R1–R12).

## Resumen

| Workflow | Disparador | Jobs | Check en el commit | Despliega |
|----------|-----------|------|--------------------|-----------|
| `backend.yml` | push a cualquier rama que toque `backend/**` o el propio workflow | `validate` → `deploy` | `backend / validate`, `backend / deploy` | `horario-api`, solo `main` |
| `frontend.yml` | push a cualquier rama que toque `frontend/**` o el propio workflow | `validate` → `deploy` | `frontend / validate`, `frontend / deploy` | `horario-web`, solo `main` |
| `integration.yml` | cualquier push a `main` | `integration` | `integration / integration` | nunca (informativo) |

Los push de tags no disparan ningún workflow (`branches: ['**']`).

## Reglas comunes

- `runs-on: ubuntu-latest`; `timeout-minutes: 10` en **cada** job (FR-011a).
- Cada paso tiene un nombre en español que identifica la comprobación (SC-006), p. ej.
  "Lint", "Tests unitarios", "Tests e2e", "Build", "Prueba de arranque", "Migraciones de
  producción", "Desplegar en Vercel", "Verificar producción".
- Instalación con `npm ci` y caché de npm por `package-lock.json` del paquete (FR-003).
- Ningún paso usa `continue-on-error` salvo el primer intento de despliegue (ver abajo);
  cualquier fallo deja el job en rojo (FR-010).
- Sin dependencias npm nuevas en los paquetes; la CLI de Vercel se instala solo en el runner.

## Concurrencia

| Workflow | `group` | `cancel-in-progress` |
|----------|---------|----------------------|
| `backend.yml` | `backend-${{ github.ref }}` | `${{ github.ref != 'refs/heads/main' }}` |
| `frontend.yml` | `frontend-${{ github.ref }}` | `${{ github.ref != 'refs/heads/main' }}` |
| `integration.yml` | `integration-${{ github.ref }}` | `true` |

En `main`: las ejecuciones de un mismo paquete se serializan y nunca se cancela una en curso;
si se acumulan, solo queda pendiente la más reciente (FR-014).

## `backend.yml`

### Job `validate` (Node 24)

Service container `postgres:17` (`horario`/`horario`, base `horario_ci`, puerto 5432,
health check `pg_isready`).

| # | Paso | Comando (en `backend/`) | Falla si |
|---|------|--------------------------|----------|
| 1 | Instalar dependencias | `npm ci` | el lockfile no cuadra |
| 2 | Lint | `npm run lint:ci` | cualquier error de ESLint/Prettier |
| 3 | Tests unitarios | `npm test` | algún test falla |
| 4 | Build | `npm run build` | error de compilación o de tipos |
| 5 | Prueba de arranque | `npx prisma migrate deploy` + `node dist/main` + espera del health ([smoke-checks.md](smoke-checks.md) §B1) | migración inválida, la app no arranca o el health ≠ `{"status":"ok"}` |
| 6 | Tests e2e | `npm run test:e2e` con `DATABASE_URL_TEST` = base del servicio | algún e2e falla |
| – | Log del backend | `cat backend.log` (solo `if: failure()`) | – |

Variables del job: `DATABASE_URL`/`DATABASE_URL_TEST` =
`postgresql://horario:horario@localhost:5432/horario_ci?schema=public`,
`JWT_SECRET=ci-secret`, `CORS_ORIGIN=http://localhost:5173`, `PORT=3000` (valores de prueba,
no secretos).

### Job `deploy` (Node 24) — `needs: validate`, `if: github.ref == 'refs/heads/main'`, `environment: production`

| # | Paso | Comando (en `backend/`) |
|---|------|--------------------------|
| 1 | Comprobar secretos | falla con `::error::Falta el secreto <NOMBRE>` si alguno está vacío |
| 2 | Instalar dependencias | `npm ci` (necesario para la CLI de Prisma) |
| 3 | Instalar CLI de Vercel | `npm install --global vercel@65.2.0` |
| 4 | Descargar configuración | `vercel pull --yes --environment=production --token=$VERCEL_TOKEN` |
| 5 | Build de Vercel | `vercel build --prod --token=$VERCEL_TOKEN` |
| 6 | Migraciones de producción | `npx prisma migrate deploy` con `DATABASE_URL_UNPOOLED=$PROD_DATABASE_URL` |
| 7 | Desplegar en Vercel | `vercel deploy --prebuilt --prod`; si falla, espera 15 s y lo reintenta **1 vez** |
| 8 | Verificar producción | health de `PROD_API_URL` ([smoke-checks.md](smoke-checks.md) §B1, con la URL de producción); si falla, job en rojo sin redesplegar ni rollback (FR-013b) |

Si el paso 6 falla, los pasos 7–8 no se ejecutan: `horario-api` no se despliega (FR-013).
Si el paso 7 falla dos veces, el job queda en rojo y producción sigue en la versión
anterior; las migraciones aplicadas se mantienen (FR-013a). El paso 7 escribe la URL del
despliegue en `$GITHUB_STEP_SUMMARY`.

Entorno del job: `VERCEL_ORG_ID` ← `secrets.VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` ←
`secrets.VERCEL_PROJECT_ID_API`, `PROD_API_URL=https://horario-api-six.vercel.app`.

## `frontend.yml`

### Job `validate` (Node 24)

| # | Paso | Comando (en `frontend/`) | Falla si |
|---|------|---------------------------|----------|
| 1 | Instalar dependencias | `npm ci` | el lockfile no cuadra |
| 2 | Lint | `npm run lint` | cualquier error de ESLint |
| 3 | Tests unitarios | `npm test` | algún test falla |
| 4 | Build | `npm run build` | error de `tsc -b` o de Vite |
| 5 | Prueba de arranque | `npm run preview -- --port 4173 --strictPort` + comprobación §F1 | `/` no responde 200 con el HTML de la SPA |

### Job `deploy` (Node 24) — `needs: validate`, `if: github.ref == 'refs/heads/main'`, `environment: production`

Igual que el del backend sin los pasos 2 y 6: comprobar secretos → CLI de Vercel →
`vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` (1 reintento) →
verificar que `PROD_WEB_URL` responde 200 (§F1).

Entorno del job: `VERCEL_PROJECT_ID` ← `secrets.VERCEL_PROJECT_ID_WEB`,
`PROD_WEB_URL=https://horario-web-eosin.vercel.app`. `VITE_API_URL` de producción llega con
`vercel pull` (variables del entorno Production del proyecto).

## `integration.yml`

### Job `integration` (Node 24)

Service container `postgres:17` como en `backend / validate`.

| # | Paso | Detalle |
|---|------|---------|
| 1 | Backend: instalar y compilar | `npm ci` y `npm run build` en `backend/` |
| 2 | Backend: arrancar | `npx prisma migrate deploy` + `node dist/main` con `PORT=3001`, `CORS_ORIGIN=http://localhost:4173` |
| 3 | Frontend: instalar y compilar | `npm ci` y `npm run build` en `frontend/` con `VITE_API_URL=http://localhost:3001` |
| 4 | Frontend: servir | `npm run preview -- --port 4173 --strictPort` |
| 5 | Health del backend | §I1 |
| 6 | Frontend servido | §I2 |
| 7 | Frontend apunta al backend | §I3 |
| 8 | CORS acepta el origen del frontend | §I4 |
| 9 | CORS rechaza otros orígenes | §I5 |
| – | Logs | `backend.log` y `frontend.log` (solo `if: failure()`) |

No tiene relación (`needs`) con los otros workflows: su resultado no bloquea, retrasa ni
revierte despliegues (FR-018).

## Entradas externas

Todos los secretos son **environment secrets** del GitHub Environment `production`, cuya
regla de ramas solo admite `main` (FR-019a). No hay secretos de repositorio. Solo los jobs
`deploy` declaran `environment: production`; `validate` e `integration` no reciben ningún
secreto.

| Nombre | Tipo | Lo usa |
|--------|------|--------|
| `VERCEL_TOKEN` | secreto de `production` | `backend / deploy`, `frontend / deploy` |
| `VERCEL_ORG_ID` | secreto de `production` | ambos `deploy` |
| `VERCEL_PROJECT_ID_API` | secreto de `production` | `backend / deploy` |
| `VERCEL_PROJECT_ID_WEB` | secreto de `production` | `frontend / deploy` |
| `PROD_DATABASE_URL` | secreto de `production` | `backend / deploy` (paso 6) |

Procedencia de cada uno en [../data-model.md](../data-model.md) y en el README.
