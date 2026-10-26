# Research: Pipeline de CI/CD

**Feature**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Fecha**: 2026-10-26

Decisiones técnicas tomadas a partir de las indicaciones del equipo y de comprobar el
estado real del repositorio y de los proyectos de Vercel (`vercel project inspect`).

## Hechos comprobados del entorno

- `horario-api` y `horario-web` tienen **Root Directory `.`** y **Node.js 24.x** en Vercel;
  se crearon y desplegaron con la CLI desde `backend/` y `frontend/` (cada carpeta tiene su
  `.vercel/project.json`). El framework lo fija cada `vercel.json` (`nestjs` / `vite`).
- `backend/package.json` → `lint` ejecuta `eslint ... --fix`; `frontend` → `eslint .` (sin
  fix). Ambos pasan hoy sin `--fix`.
- `npm run build` del backend genera `backend/dist/main.js`; `start:prod` = `node dist/main`.
- El backend lee `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` y `PORT`; Prisma usa
  `DATABASE_URL_UNPOOLED ?? DATABASE_URL` para las migraciones (`prisma.config.ts`).
- Los e2e toman `DATABASE_URL_TEST`, la copian a `DATABASE_URL`/`DATABASE_URL_UNPOOLED` y
  aplican `prisma migrate deploy` en `test/global-setup.ts`.
- El frontend usa `VITE_API_URL` con `http://localhost:3000` como valor por defecto.

## R1. Plataforma y estructura de workflows

- **Decision**: GitHub Actions con tres workflows en `.github/workflows/`:
  `backend.yml`, `frontend.yml` e `integration.yml`. Cada workflow de paquete tiene dos
  jobs: `validate` y `deploy` (`needs: validate`, solo en `main`).
- **Rationale**: un workflow por paquete da un check independiente por paquete en el commit
  (FR-002, FR-011) y permite que cada uno despliegue sin esperar al otro (FR-012). Separar
  `deploy` en su propio job hace que "si falla la validación no se despliega" sea estructural
  (`needs`) y no dependa de condiciones en pasos.
- **Alternatives considered**: un solo workflow con jobs por paquete (un fallo marca todo el
  workflow en rojo y mezcla resultados); workflows reutilizables o acciones compuestas
  (abstracción innecesaria para dos paquetes, YAGNI).

## R2. Disparadores y filtros de rutas

- **Decision**:
  - `backend.yml`: `on.push` con `branches: ['**']` y `paths: ['backend/**',
    '.github/workflows/backend.yml']`. Igual para `frontend.yml` con `frontend/**`.
  - `integration.yml`: `on.push.branches: [main]`, sin filtro de rutas.
- **Rationale**: `branches: ['**']` excluye los push de tags (GitHub no evalúa `paths` en
  tags y los ejecutaría siempre). El filtro de rutas evita validar y redesplegar un paquete
  que no cambió; un commit que no toca un paquete no muestra check de ese paquete. La
  constitución v1.2.0 y FR-001 limitan la validación obligatoria a los pushes que modifican
  el paquete (enmienda por el hallazgo C1 de `/speckit-analyze`). La integración corre en
  todo push a `main` porque su objetivo es
  detectar incompatibilidades entre paquetes, que pueden aparecer cambiando solo uno.
- **Alternatives considered**: sin filtro de rutas (redespliegues y migraciones sin
  cambios, más minutos de CI); `workflow_dispatch` para relanzar a mano (innecesario:
  "Re-run jobs" de GitHub cubre la recuperación manual de la spec).
- **Limitación conocida**: si un push supera los límites de diff de GitHub (más de 300
  archivos cambiados), el filtro de rutas deja de aplicarse y el workflow se ejecuta igual;
  es inocuo.

## R3. Entorno de ejecución (Node.js)

- **Decision**: **Node 24** en todos los jobs (`actions/setup-node`, `node-version: 24`,
  `cache: npm` y `cache-dependency-path` al `package-lock.json` del paquete) e instalación
  con `npm ci`.
- **Rationale**: es la versión configurada en los proyectos de Vercel y la recomendada por
  el plan de la feature 001 (cumple `engines >=20.19`). En `deploy`, `vercel build` compila
  **en el runner** el artefacto que luego se sube con `--prebuilt`; compilarlo con la misma
  versión que el runtime de Vercel evita diferencias de comportamiento y de módulos nativos
  (`bcrypt`). Validar con la misma versión hace que lo probado sea lo desplegado.
- **Alternatives considered**: Node 20 (la propuesta inicial; descartada tras
  `/speckit-analyze` (M6): fuera de soporte desde 2026-04-30 y distinta de producción); Node
  20 en validación y 24 en despliegue (lo validado no coincidiría con lo desplegado).

## R4. Lint en CI sin autocorrección

- **Decision**: añadir el script `lint:ci` al backend
  (`eslint "{src,apps,libs,test}/**/*.ts"`, sin `--fix`) y usarlo en CI. El frontend usa su
  `npm run lint` actual.
- **Rationale**: con `--fix`, CI corregiría los errores en el runner y el paso pasaría en
  verde con código mal formateado en el repo (incumple FR-004). Un script evita repetir el
  glob en el workflow. No añade dependencias.
- **Alternatives considered**: quitar `--fix` de `lint` (cambia el uso local que espera el
  equipo); invocar `npx eslint ...` directamente en el workflow (duplica el glob).

## R5. Base de datos desechable y orden de pasos del backend

- **Decision**: un service container `postgres:17` por job (`POSTGRES_USER/PASSWORD=horario`,
  `POSTGRES_DB=horario_ci`, puerto 5432 y `--health-cmd pg_isready`). Orden de pasos de
  `validate`: `npm ci` → `lint:ci` → `npm test` → `npm run build` → **prueba de arranque** →
  `test:e2e`. La prueba de arranque se hace sobre la base vacía y los e2e reutilizan la
  misma base (`DATABASE_URL_TEST` = la misma URL).
- **Rationale**: ejecutar el arranque antes que los e2e hace que `prisma migrate deploy` se
  aplique sobre una base **vacía**, que es lo que prueba de verdad FR-008 (todas las
  migraciones desde cero). Los e2e vuelven a llamar a `migrate deploy` (no-op) y vacían las
  tablas en cada suite (`resetDatabase()`), así que el health check previo no interfiere. Una
  sola base evita crear una segunda con `psql`. El contenedor nace y muere con el job
  (FR-006: sin tocar ninguna base compartida). Si el servicio no arranca, el job falla al
  iniciarse (edge case "base no disponible").
- **Alternatives considered**: dos bases (`horario_test` y otra para el arranque) creadas con
  `createdb` (un paso más sin beneficio); arranque después de los e2e (las migraciones ya
  estarían aplicadas y no se probarían desde cero).
- **Versión**: `postgres:17`, la misma que `docker-compose.yml` en local (la propuesta
  inicial era `postgres:16`; se alinea tras `/speckit-analyze`, L3).

## R6. Prueba de arranque del backend

- **Decision**: con `DATABASE_URL=postgresql://horario:horario@localhost:5432/horario_ci`,
  `JWT_SECRET` y `CORS_ORIGIN` de prueba y `PORT=3000`: `npx prisma migrate deploy`, luego
  `node dist/main` en segundo plano (log a `backend.log`) y espera con
  `curl --silent --fail --retry 30 --retry-delay 2 --retry-connrefused --retry-all-errors
  --max-time 5` a `GET /api/health`, comparando el cuerpo exacto con `{"status":"ok"}`.
  Paso de diagnóstico `if: failure()` que imprime `backend.log`.
- **Rationale**: los reintentos cubren el tiempo de arranque (~60 s como máximo), dentro del
  límite del job. Comparar el cuerpo, y no solo el 200, es lo que pide FR-008. El log en
  caso de fallo permite identificar la causa en menos de 1 minuto (SC-006). Los procesos en
  segundo plano siguen vivos entre pasos y el runner los termina al acabar el job.
- **Alternatives considered**: `wait-on` u otra herramienta (dependencia nueva); `sleep`
  fijo (lento y frágil); script compartido en `.github/scripts/` (una línea de `curl` no lo
  justifica y obligaría a añadirlo a los filtros de rutas).

## R7. Prueba de arranque del frontend

- **Decision**: tras `npm run build`, `npm run preview -- --port 4173 --strictPort` en
  segundo plano y `curl --fail` con reintentos a `http://localhost:4173/`, que debe responder
  200 con HTML que contenga `<div id="root">`.
- **Rationale**: `vite preview` sirve exactamente `dist/`, que es lo que se publica; un 200
  con el HTML de la SPA prueba FR-009 sin herramientas nuevas.
- **Alternatives considered**: un navegador headless (Playwright: dependencia y minutos
  extra, fuera de lo que pide la spec).

## R8. Flujo de integración

- **Decision**: un único job en `integration.yml` con `postgres:17`:
  1. Backend: `npm ci`, `build`, `prisma migrate deploy` y `node dist/main` en el
     **puerto 3001** con `CORS_ORIGIN=http://localhost:4173`.
  2. Frontend: `npm ci` y `npm run build` con `VITE_API_URL=http://localhost:3001`, y
     `vite preview` en el 4173.
  3. Comprobaciones (cada una en su propio paso, para que el nombre del paso indique cuál
     falló): (a) health = `{"status":"ok"}`; (b) `GET /` del frontend = 200; (c) el bundle
     de `dist/assets` contiene `http://localhost:3001`; (d) preflight CORS
     `OPTIONS /api/auth/login` con `Origin: http://localhost:4173`,
     `Access-Control-Request-Method: POST` y `Access-Control-Request-Headers:
     authorization,content-type` → `Access-Control-Allow-Origin: http://localhost:4173`;
     (e) control negativo: el mismo preflight con `Origin: http://evil.example` **no**
     devuelve `Access-Control-Allow-Origin`.
- **Rationale**: usar el 3001 (distinto del valor por defecto del cliente) hace que la
  comprobación (c) demuestre que `VITE_API_URL` se aplicó en el build. El preflight es el
  camino real del navegador (el frontend envía `Authorization` y JSON). El control negativo
  evita un falso verde si CORS aceptara cualquier origen. Detalle en
  [contracts/smoke-checks.md](contracts/smoke-checks.md).
- **Alternatives considered**: e2e en navegador (fuera de alcance); reutilizar los
  artefactos de los otros workflows (acoplaría workflows independientes).
- **Limitación conocida**: no detecta que el frontend llame a un endpoint que el backend no
  expone (ejemplo de la US3); eso requeriría tests de contrato o de navegador. FR-017 solo
  exige (a)–(c) de la spec, que quedan cubiertos.

## R9. Despliegue a producción con la CLI de Vercel

- **Decision**: job `deploy` (`needs: validate`, `if: github.ref == 'refs/heads/main'`,
  `environment: production`, ver R12), con `working-directory` en el paquete y
  `vercel@65.2.0` instalado globalmente
  (versión fijada, comprobada en local). Pasos:
  1. Comprobar que los secretos necesarios no están vacíos (error explícito por secreto).
  2. `vercel pull --yes --environment=production`.
  3. `vercel build --prod`.
  4. Solo backend: `npx prisma migrate deploy` contra producción
     (`DATABASE_URL_UNPOOLED` = secreto `PROD_DATABASE_URL`).
  5. `vercel deploy --prebuilt --prod`, con **un reintento** tras 15 s si falla.
  6. Verificación en producción (FR-013b): backend → health = `{"status":"ok"}`; frontend →
     `GET /` = 200 (con reintentos de la petición, sin redesplegar). Si falla, el job queda
     en rojo sin reintentar el despliegue ni hacer rollback. URL del despliegue en el
     resumen del job.
  `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID` (desde `VERCEL_PROJECT_ID_API` / `_WEB`) se pasan
  como variables de entorno del job; `VERCEL_TOKEN` con `--token`.
- **Rationale**: los proyectos tienen Root Directory `.`, así que la CLI debe ejecutarse
  desde la carpeta del paquete (como en los despliegues manuales). Construir antes de migrar
  hace que un fallo de build no deje migraciones aplicadas sin despliegue. El reintento solo
  envuelve la subida (el fallo transitorio de plataforma que cubre FR-013a); la migración
  no se reintenta y, si falla, el job se detiene antes de desplegar (FR-013). Las
  migraciones aplicadas no se revierten (FR-013a). La URL de producción (alias estable) se
  usa en la verificación porque las URLs propias de cada despliegue pueden estar protegidas
  por Vercel Deployment Protection.
- **Alternatives considered**: `vercel deploy --prod` sin `--prebuilt` (el build ocurre en
  Vercel y volvería a depender de su `buildCommand`); la action de terceros
  `amondnet/vercel-action` (dependencia externa sin ventaja); migrar dentro del
  `buildCommand` de Vercel (situación actual, que se elimina: migraría también en cualquier
  despliegue no controlado por el pipeline).

## R10. Concurrencia y tiempos

- **Decision**: a nivel de workflow (`backend.yml`, `frontend.yml`):
  `concurrency.group: <paquete>-${{ github.ref }}` y
  `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`. `integration.yml`:
  `group: integration-${{ github.ref }}`, `cancel-in-progress: true`. `timeout-minutes: 10`
  en cada job.
- **Rationale**: en `main` las ejecuciones de un paquete se serializan en orden de push y
  nunca se cancela una en curso (no se corta una migración a medias). GitHub mantiene como
  máximo una ejecución pendiente por grupo y sustituye la pendiente por la más nueva, de modo
  que producción termina en el último commit (FR-014); la sustituida aparece como
  "cancelada". Serializar el workflow completo, y no solo el job `deploy`, evita que un
  commit posterior valide antes y luego un commit anterior lo sobrescriba en producción. En
  otras ramas solo importa el último commit. Con validación < 5 min y deploy ~3 min, dos
  pushes seguidos siguen dentro de los 15 min de SC-003.
- **Alternatives considered**: concurrencia solo en `deploy` (rompe el orden, ver arriba);
  cancelar también en `main` (podría cortar una migración).
- **Riesgo aceptado**: relanzar a mano una ejecución antigua de `main` desplegaría ese
  commit; se documenta en el README.

## R11. Vercel: desactivar el auto-deploy por Git y quitar la migración del build

- **Decision**: añadir `"git": { "deploymentEnabled": false }` a `backend/vercel.json` y
  `frontend/vercel.json`, y cambiar el `buildCommand` del backend a `npm run build`.
- **Rationale**: la constitución II exige que solo el pipeline dispare despliegues;
  `deploymentEnabled: false` lo garantiza aunque se conecte el repositorio a Vercel y no
  afecta a la CLI. Con el `buildCommand` limpio, las migraciones solo las aplica el pipeline
  (constitución, "Flujo"; FR-013).
- **Alternatives considered**: "Ignored Build Step" en el dashboard (configuración fuera del
  repo, no versionada); desconectar Git solo en el dashboard (ídem).

## R12. Secretos

- **Decision**: un GitHub Environment `production` con regla *Deployment branches and
  tags* = **solo `main`**, que guarda como **environment secrets** `VERCEL_TOKEN_API` y
  `VERCEL_TOKEN_WEB` (tokens de proyecto: cada uno solo accede a su proyecto, así que hay
  uno por job `deploy`),
  `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `VERCEL_PROJECT_ID_WEB` y `PROD_DATABASE_URL`
  (URL **directa** de Neon, sin `-pooler`). No hay secretos a nivel de repositorio. Los dos
  jobs `deploy` declaran `environment: production`; ningún otro job lo hace. Las URLs
  públicas de producción van como `env` en el workflow (no son secretas). Se documentan
  nombres y procedencia en el README, sin valores.
- **Rationale**: FR-019/FR-019a/FR-020. Con secretos de repositorio, cualquier rama podría
  editar su workflow y usarlos (hallazgo H1 de `/speckit-analyze`); la regla de ramas del
  Environment la aplica GitHub, fuera del workflow, así que un job de otra rama que declare
  `environment: production` es rechazado antes de recibir los secretos. GitHub enmascara
  los secretos en los logs. `migrate deploy` necesita la conexión directa (las migraciones
  usan locks que el pooler de Neon no admite bien).
- **Alternatives considered**: secretos de repositorio (accesibles desde cualquier rama;
  incumplen FR-019a); protección de rama sola (no impide usar secretos en otras ramas);
  leer `DATABASE_URL_UNPOOLED` de Vercel con `vercel env pull` (amplía el alcance del token
  y acopla la migración a Vercel).
- **Efecto secundario**: cada ejecución de `deploy` aparece como despliegue del Environment
  `production` en GitHub, con su commit; no se configuran revisores obligatorios (el
  despliegue sigue siendo automático).
- **Nota**: `prisma migrate deploy` imprime el host de la base (no la contraseña); el
  usuario y la contraseña de la URL quedan enmascarados por ser parte del secreto.

## R13. Restos de los previews

- **Decision**:
  - **Quitar el comodín `*` de CORS** (`backend/src/common/cors.ts`): `CORS_ORIGIN` pasa a
    ser una lista de orígenes exactos y `isOriginAllowed` compara por igualdad. Se
    actualizan `cors.spec.ts` (fuera el caso de previews; se mantienen el caso exacto y los
    rechazos) y el comentario de `backend/.env.example`.
  - **Limpieza manual en Vercel/Neon** listada en [quickstart.md](quickstart.md): revisar
    que `CORS_ORIGIN` de producción no dependa de un comodín, borrar las variables del
    entorno Preview de ambos proyectos y desactivar en la integración de Neon la creación
    de una rama de BD por preview.
- **Rationale**: el comodín solo existía para los previews (research R8 de la feature 001),
  que la constitución v1.1.0 y FR-016 eliminan; sin requisito que lo respalde, la
  constitución I y VI piden quitarlo. El cambio de comportamiento está en la spec como
  FR-021 (hallazgo C2 de `/speckit-analyze`). Comparar por igualdad es más simple y elimina la
  construcción de expresiones regulares a partir de una variable de entorno.
- **Alternatives considered**: mantener el comodín "por si acaso" (código sin requisito);
  dejarlo y solo actualizar el comentario.
- **Orden obligatorio**: comprobar `CORS_ORIGIN` en producción **antes** de desplegar este
  cambio; si solo contuviera una entrada con `*`, el frontend de producción dejaría de poder
  llamar al backend.
