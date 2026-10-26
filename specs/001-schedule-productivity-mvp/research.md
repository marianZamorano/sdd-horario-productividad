# Research: Mini-MVP Horario Productivo

**Feature**: `001-schedule-productivity-mvp` · **Date**: 2026-10-26 · **Plan**: [plan.md](plan.md)

Cada sección sigue el formato *Decision / Rationale / Alternatives considered*. No quedan
puntos `NEEDS CLARIFICATION` en el Technical Context.

## R1. Despliegue del backend NestJS en Vercel

- **Decision**: proyecto Vercel con *Root Directory* `backend`, sin `vercel.json`
  obligatorio. Vercel detecta NestJS y usa `src/main.ts` como entrypoint; toda la app se
  convierte en una única Vercel Function sobre Fluid Compute (Node.js 24 LTS).
  `main.ts` hace `app.setGlobalPrefix('api')` y `app.listen(process.env.PORT ?? 3000)`.
  Build command del proyecto: `npx prisma migrate deploy && npm run build` (el script
  `build` incluye `prisma generate`).
- **Rationale**: soporte zero-config oficial (docs de Vercel "NestJS on Vercel",
  actualizado 2026-08); un solo artefacto simplifica logs y rollbacks; Fluid Compute
  reutiliza instancias y reduce los arranques en frío.
- **Alternatives considered**: adaptar Nest a un handler serverless manual
  (`@vendia/serverless-express`), innecesario con zero-config; Vercel Services en un único
  proyecto, descartado porque la constitución fija un proyecto por carpeta.

## R2. Base de datos y ORM

- **Decision**: Neon Postgres instalado desde Vercel Marketplace y conectado al proyecto
  backend (inyecta `DATABASE_URL`, con pooling, y `DATABASE_URL_UNPOOLED`). Prisma ORM
  7.x con `prisma.config.ts`, driver adapter `@prisma/adapter-pg` y carga explícita de
  `.env` con `dotenv` (Prisma 7 ya no lo hace solo). Las migraciones usan la URL sin
  pooling.
- **Rationale**: Vercel Postgres ya no existe; Neon es la opción Postgres nativa del
  Marketplace y crea ramas de BD por preview. `adapter-pg` funciona con el connection
  string de Neon sobre TCP en Fluid Compute sin depender del driver HTTP.
- **Alternatives considered**: `@prisma/adapter-neon` (driver serverless por WebSocket),
  útil en Edge, que está deprecado; TypeORM, con migraciones y tipado más débiles para
  este caso; SQL a mano, que contradice la constitución (Prisma).

## R3. Entorno local

- **Decision**: `docker-compose.yml` en la raíz con `postgres:17` y dos bases,
  `horario` (desarrollo) y `horario_test` (e2e). Alternativa documentada: una rama de
  desarrollo de Neon con `DATABASE_URL` propio.
- **Rationale**: los e2e con supertest necesitan una BD real y desechable; Docker la da sin
  coste ni red.
- **Alternatives considered**: SQLite en tests, que diverge de Postgres en tipos de
  fecha/enum; pg-mem, con soporte parcial de Prisma.

## R4. Zonas horarias y representación del tiempo

- **Decision**: el usuario guarda una zona IANA (`timezone`, p. ej. `America/La_Paz`),
  capturada del navegador (`Intl.DateTimeFormat().resolvedOptions().timeZone`) al
  registrarse. Las franjas se guardan como `weekday` (1 = lunes … 7 = domingo) y minutos
  desde medianoche (hora local). Los bloques se guardan como instantes `timestamptz`
  (UTC). Las semanas se identifican por `weekStart` = fecha local del lunes
  (`YYYY-MM-DD`). Las conversiones se hacen con **Luxon** dentro de las funciones puras.
- **Rationale**: la spec usa la zona del navegador; persistirla en el usuario hace que el
  backend calcule "ahora", el inicio de semana y la racha igual que lo ve el usuario, y
  maneja bien los cambios de horario de verano.
- **Alternatives considered**: enviar la zona en cada request, que es más frágil; usar
  solo `Date` nativo, propenso a errores con el horario de verano; date-fns-tz, viable pero
  con una API menos directa para "inicio de semana local".

## R5. Algoritmo de generación (función pura)

- **Decision**: `generateSchedule(input): ScheduleResult` en
  `backend/src/schedule/scheduler.ts`, sin efectos secundarios. Entradas: `now`,
  `timezone`, `weekStart`, `slots`, `tasks` (con `pendingMinutes`) y `keptBlocks`. Pasos:
  1. Construir los intervalos libres de la semana a partir de las franjas (local → UTC),
     recortados a `now` redondeado hacia arriba a 5 min.
  2. Restar los bloques conservados, ampliados 5 min por cada lado (descanso).
  3. Ordenar las tareas (FR-011): vencidas → prioridad → fecha límite (nulls last) →
     `createdAt` → `id` (último desempate, para garantizar el determinismo).
  4. Para cada tarea, recorrer los intervalos en orden cronológico. En tareas no vencidas,
     cortar el intervalo al final del día de la fecha límite (23:59:59 local). Tamaño del
     bloque según FR-013: `min(50, hueco, pendiente)`; si el resto queda entre 1 y 24,
     acortar para dejar 25; si el tamaño final es menor de 25 y no es el resto completo de
     la tarea, saltar el hueco. Tras cada bloque, el intervalo empieza en `fin + 5 min`.
  5. Lo que no cabe se devuelve en `unassigned` con el motivo `NO_SPACE` o
     `NO_SPACE_BEFORE_DEADLINE` (cuando hubo hueco después de la fecha límite).
  - `pendingMinutes` = duración − minutos completados − minutos de bloques `PLANNED` de
    otras semanas, para que generar dos semanas no planifique dos veces lo mismo.
- **Rationale**: es greedy, determinista, O(tareas × intervalos) y basta para 50 tareas en
  mucho menos de 1 s (SC-002). Cumple la constitución III (pura, con la fecha actual como
  parámetro).
- **Alternatives considered**: optimización con un solver (CP-SAT), excesiva para el MVP;
  repartir la tarea en bloques iguales, descartado en la clarificación (se eligió "lo
  antes posible").

## R6. Autenticación

- **Decision**: registro e inicio de sesión devuelven un JWT de acceso (HS256,
  `JWT_SECRET`, caducidad de 7 días) con `sub = userId`. El frontend lo guarda en
  `localStorage` y lo envía en `Authorization: Bearer`. Las contraseñas usan bcrypt con
  coste 10. Un `JwtAuthGuard` global con un decorador `@Public()` para registro, login y
  health. Ante un 401, el frontend limpia el token y redirige a `/login`.
- **Rationale**: el frontend y el backend están en dominios distintos de Vercel; las
  cookies cross-site exigirían `SameSite=None` y protección CSRF. El header Bearer es lo
  que fija la constitución.
- **Alternatives considered**: cookie httpOnly con refresh tokens, más segura frente a XSS
  pero fuera del alcance del MVP; un proveedor externo (Clerk o Auth0), que contradice
  "email + contraseña propios".

## R7. Aislamiento por usuario

- **Decision**: todos los servicios reciben `userId` del token y filtran con
  `where: { id, userId }`. Si no hay coincidencia → `404` (nunca `403`), para no revelar
  que el recurso existe (FR-003). Hay e2e con dos usuarios por cada recurso.
- **Rationale**: es simple y verificable; evita fugas de existencia.
- **Alternatives considered**: Row-Level Security en Postgres, potente pero añade
  complejidad de conexión por usuario.

## R8. CORS y variables de entorno

- **Decision**: el backend lee `CORS_ORIGIN`, una lista separada por comas que admite un
  comodín `*` en el subdominio (p. ej. `https://horario-web-*.vercel.app`) para los
  previews. El frontend lee `VITE_API_URL` en build. Variables: backend `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, `JWT_SECRET`, `CORS_ORIGIN`; frontend `VITE_API_URL`. Cada
  paquete incluye un `.env.example`.
- **Rationale**: las URLs de preview cambian por PR, y la constitución exige preview por
  PR.
- **Alternatives considered**: `origin: true` (cualquier origen), descartado por seguridad.

## R9. Frontend

- **Decision**: React 18.3 + Vite + TypeScript estricto; React Router (modo data
  router, rutas protegidas); TanStack Query para el estado de servidor (invalidar
  `schedule` y `stats` tras marcar bloques); un cliente `fetch` tipado a mano en
  `src/api/` con tipos que reflejan `contracts/`; Tailwind CSS v4 (plugin
  `@tailwindcss/vite`, sin archivo de configuración); semana en una cuadrícula CSS propia
  de 7 columnas, sin librería de calendario. Tests con Vitest + Testing Library.
  `frontend/vercel.json` con un rewrite de `/(.*)` a `/index.html` para el enrutado SPA.
- **Rationale**: es lo que pidió el usuario (React 18). La vista semanal es sencilla
  (bloques por día) y una librería de calendario añadiría peso y estilos ajenos (YAGNI).
  Vitest es el runner nativo de Vite; Jest queda para el backend, como fija la
  constitución.
- **Alternatives considered**: FullCalendar, pesado y con licencia por plugins; CSS
  Modules, viable pero más lento de maquetar; un paquete `shared/` con tipos comunes, que
  añade tooling de monorepo (workspaces y build) no justificado para 5 recursos.

## R10. Calidad y tooling

- **Decision**: ESLint (flat config) + Prettier en ambos paquetes; `tsconfig` con
  `strict: true`; `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y
  `transform`. Los e2e usan `horario_test` con `prisma migrate reset --force` antes de la
  suite. Paquetes npm independientes (sin workspaces) para que cada proyecto Vercel
  instale solo lo suyo.
- **Rationale**: cumple las restricciones técnicas de la constitución y mantiene cada Root
  Directory autocontenido.
- **Alternatives considered**: npm/pnpm workspaces con Turborepo, útil a mayor escala pero
  innecesario aquí.
