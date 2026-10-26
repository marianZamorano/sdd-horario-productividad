---

description: "Task list for Mini-MVP Horario Productivo"
---

# Tasks: Mini-MVP Horario Productivo

**Input**: Design documents from `/specs/001-schedule-productivity-mvp/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/README.md), [quickstart.md](quickstart.md)

**Tests**: INCLUIDOS. La constitución (principio III) exige TDD para `scheduler.ts` y `stats.ts`, y
tests e2e con supertest para cada endpoint (caso feliz, validación, 401 y acceso a un recurso
ajeno → 404). En cada historia, los tests se escriben primero y deben **fallar** antes de
implementar.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6, see spec.md)
- Include exact file paths in descriptions

## Path Conventions

- Web app: `backend/src/`, `backend/test/`, `backend/prisma/`, `frontend/src/`
- Contratos de referencia: `specs/001-schedule-productivity-mvp/contracts/*.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: monorepo, paquetes y base de datos local.

- [X] T000 Work on feature branch `001-schedule-productivity-mvp` (created from `main`; push it with `git push -u origin 001-schedule-productivity-mvp`); never commit implementation directly to `main` (constitution §Flujo)
- [X] T001 Create `docker-compose.yml` at repo root with service `postgres:17` (port 5432, user/password `horario`) and an init script `docker/init-db.sql` that creates databases `horario` and `horario_test`
- [X] T002 Scaffold NestJS 11 app in `backend/` (npm, TypeScript strict in `backend/tsconfig.json`, entrypoint `backend/src/main.ts`); remove the sample controller/service
- [X] T003 [P] Scaffold React 18.3 + Vite + TypeScript app in `frontend/` (strict `frontend/tsconfig.json`), install `react-router`, `@tanstack/react-query`, `tailwindcss` + `@tailwindcss/vite`, and wire Tailwind in `frontend/vite.config.ts` and `frontend/src/index.css`
- [X] T004 [P] Configure ESLint (flat config) + Prettier in `backend/eslint.config.mjs` and `backend/.prettierrc`, with `lint` and `format` scripts in `backend/package.json`
- [X] T005 [P] Configure ESLint (flat config) + Prettier + Vitest + Testing Library in `frontend/eslint.config.js`, `frontend/.prettierrc`, `frontend/vitest.config.ts` with `lint` and `test` scripts in `frontend/package.json`
- [X] T006 Install backend deps (`@nestjs/config`, `@nestjs/jwt`, `prisma@7`, `@prisma/client@7`, `@prisma/adapter-pg`, `pg`, `dotenv`, `bcrypt`, `class-validator`, `class-transformer`, `luxon` + their `@types`, `supertest`) and set scripts in `backend/package.json`: `build` = `prisma generate && nest build`, `test`, `test:e2e`, `start:dev`
- [X] T007 [P] Create `backend/.env.example` (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_URL_TEST`, `JWT_SECRET`, `CORS_ORIGIN=http://localhost:5173`) and `frontend/.env.example` (`VITE_API_URL=http://localhost:3000`)

**Checkpoint**: `docker compose up -d` levanta Postgres; `npm run lint` pasa en ambos paquetes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema de datos, infraestructura transversal del backend y shell del frontend.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T008 Create `backend/prisma.config.ts` (loads `dotenv`, schema path, migrations use `DATABASE_URL_UNPOOLED`) and `backend/prisma/schema.prisma` with enums `Priority`, `TaskStatus`, `BlockStatus` and models `User`, `AvailabilitySlot`, `Task`, `ScheduleBlock` exactly as in data-model.md (uuid ids, `timestamptz`, cascades, indexes `(userId, weekday, startMinute)`, `(userId, status)`, `(userId, startAt)`)
- [X] T009 Generate the initial migration `backend/prisma/migrations/*_init/` with `npx prisma migrate dev --name init` (depends on T008)
- [X] T010 [P] Implement `PrismaService` (PrismaClient + `@prisma/adapter-pg`, connect on module init) and global `PrismaModule` in `backend/src/prisma/prisma.service.ts` and `backend/src/prisma/prisma.module.ts`
- [X] T011 [P] Write unit tests first for week/time utilities in `backend/src/common/time.spec.ts`: `isMonday`, `weekRange(weekStart, tz)` → UTC `[start, end)`, `localDateOf(instant, tz)`, `endOfLocalDay(date, tz)`, `roundUpTo5(now)`, including a DST-transition week
- [X] T012 Implement those utilities with Luxon in `backend/src/common/time.ts` until T011 passes
- [X] T013 [P] Create `@Public()` decorator, `@CurrentUser()` param decorator and global `JwtAuthGuard` (reads `Authorization: Bearer`, verifies with `JWT_SECRET`, 401 otherwise) in `backend/src/common/public.decorator.ts`, `backend/src/common/current-user.decorator.ts`, `backend/src/common/jwt-auth.guard.ts`
- [X] T014 [P] Create domain error helper (`DomainException` with `code`, e.g. `EMAIL_TAKEN`, `SLOT_OVERLAP`) and global exception filter that keeps the error format of contracts/README.md in `backend/src/common/domain.exception.ts` and `backend/src/common/http-exception.filter.ts`
- [X] T015 Configure `backend/src/main.ts` and `backend/src/app.module.ts`: `ConfigModule.forRoot`, global prefix `api`, global `ValidationPipe({ whitelist, forbidNonWhitelisted, transform })` with Spanish validation messages, the global guard and filter, CORS from `CORS_ORIGIN` (comma list, supports `*` subdomain wildcard per research R8), `app.listen(process.env.PORT ?? 3000)`
- [X] T016 [P] Implement `GET /api/health` (`@Public()`) returning `{ status: 'ok' }` in `backend/src/health/health.controller.ts` and `backend/src/health/health.module.ts`
- [X] T017 Create e2e helpers in `backend/test/utils.ts` (bootstrap the app with the same config as main.ts, point `DATABASE_URL`/`DATABASE_URL_UNPOOLED` to `DATABASE_URL_TEST` in `backend/test/test-env.ts`, run the non-destructive `prisma migrate deploy` in `backend/test/global-setup.ts` before the suite, truncate tables between tests, `registerUser(email)` → token) and `backend/test/jest-e2e.json`; add `backend/test/health.e2e-spec.ts` asserting 200
- [X] T018 [P] Implement typed fetch client in `frontend/src/api/client.ts` (base `import.meta.env.VITE_API_URL`, attaches the token from `localStorage`, parses the error format, on 401 clears the token and redirects to `/login`) and shared API types in `frontend/src/api/types.ts` mirroring contracts/*.md
- [X] T019 [P] Create app shell in `frontend/src/main.tsx`, `frontend/src/App.tsx` and `frontend/src/components/Layout.tsx`: `QueryClientProvider`, router with routes `/login`, `/register`, `/availability`, `/tasks`, `/week`, `/stats`, Spanish navigation bar
- [X] T020 [P] Implement frontend date helpers (`mondayOf(date)`, `addWeeks`, `formatHHmm(minutes)`, `minutesFromHHmm`, `formatDuration`) with tests in `frontend/src/lib/dates.ts` and `frontend/src/lib/dates.test.ts`

**Checkpoint**: `npm run test:e2e` pasa con `health`; el frontend arranca con navegación vacía.

---

## Phase 3: User Story 1 - Cuenta personal (Priority: P1) 🎯 MVP

**Goal**: registro, inicio y cierre de sesión con datos privados por usuario (FR-001 a FR-003).

**Independent Test**: registrar una cuenta, cerrar sesión, volver a entrar; con una segunda cuenta, `GET /api/auth/me` devuelve solo sus datos.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T021 [P] [US1] E2E tests for contracts/auth.md in `backend/test/auth.e2e-spec.ts`: register 201 (email normalized to lowercase, no `passwordHash` in the body), duplicate email 409 `EMAIL_TAKEN`, invalid email/short password 400, unknown field 400, login 200, wrong password and unknown email → same 401 message, `GET /me` with and without a token
- [X] T022 [P] [US1] Component tests for login/register forms (validation messages in Spanish, submits, shows API error) in `frontend/src/pages/auth.test.tsx`

### Implementation for User Story 1

- [X] T023 [P] [US1] Create DTOs `RegisterDto` (email, password 8–72, optional IANA timezone validated with Luxon) and `LoginDto` in `backend/src/auth/dto/register.dto.ts` and `backend/src/auth/dto/login.dto.ts`
- [X] T024 [US1] Implement `AuthService` (bcrypt cost 10, unique email → `EMAIL_TAKEN`, JWT `sub=userId` with 7-day expiry, `toUserDto` without hash) in `backend/src/auth/auth.service.ts`
- [X] T025 [US1] Implement `AuthController` (`POST register` and `POST login` as `@Public()`, `GET me`) and `AuthModule` registering `JwtModule` in `backend/src/auth/auth.controller.ts` and `backend/src/auth/auth.module.ts`; run T021 until green
- [X] T026 [P] [US1] Implement session context (token + user in `localStorage`, `login`, `register` sending `Intl` timezone, `logout`) and `ProtectedRoute` in `frontend/src/auth/AuthContext.tsx` and `frontend/src/auth/ProtectedRoute.tsx`
- [X] T027 [US1] Build `LoginPage` and `RegisterPage` (Spanish UI, inline errors, redirect to `/tasks` on success) in `frontend/src/pages/LoginPage.tsx` and `frontend/src/pages/RegisterPage.tsx`, add a logout button to `Layout.tsx`; run T022 until green

**Checkpoint**: US1 funcional y testeada de forma independiente.

---

## Phase 4: User Story 2 - Disponibilidad semanal (Priority: P1)

**Goal**: CRUD de franjas por día de la semana con validación de rango y solape (FR-004, FR-005).

**Independent Test**: crear franjas en varios días, recargar y verlas ordenadas; `lunes 21:00–23:00` sobre `lunes 18:00–22:00` → 409.

### Tests for User Story 2 ⚠️

- [X] T028 [P] [US2] E2E tests for contracts/availability.md in `backend/test/availability.e2e-spec.ts`: create 201, list ordered by weekday/startMinute, `end <= start` 400, non-multiple of 15 400, overlap 409 `SLOT_OVERLAP`, PATCH that excludes itself from the overlap check, DELETE 204, 401 without a token, user B's PATCH/DELETE on A's slot → 404
- [X] T029 [P] [US2] Component test for the slot form and list (HH:mm ↔ minutes conversion, shows the overlap error) in `frontend/src/pages/AvailabilityPage.test.tsx`

### Implementation for User Story 2

- [X] T030 [P] [US2] Create `CreateSlotDto` and `UpdateSlotDto` (weekday 1–7, minutes multiple of 15, cross-field `endMinute > startMinute`) in `backend/src/availability/dto/`
- [X] T031 [US2] Implement `AvailabilityService` (all queries scoped by `userId`, overlap check `a.start < b.end && b.start < a.end`, 404 when not owned) in `backend/src/availability/availability.service.ts`
- [X] T032 [US2] Implement `AvailabilityController` and `AvailabilityModule` in `backend/src/availability/availability.controller.ts` and `backend/src/availability/availability.module.ts`; run T028 until green
- [X] T033 [P] [US2] Add availability API hooks (`useSlots`, `useCreateSlot`, `useUpdateSlot`, `useDeleteSlot`) in `frontend/src/api/availability.ts`
- [X] T034 [US2] Build `AvailabilityPage` (slots grouped by day, `SlotForm` with day selector and 15-min time inputs, edit/delete) in `frontend/src/pages/AvailabilityPage.tsx` and `frontend/src/components/SlotForm.tsx`; run T029 until green

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Gestión de tareas (Priority: P1)

**Goal**: CRUD de tareas con estado y minutos restantes, terminar y reabrir manualmente (FR-006 a FR-009).

**Independent Test**: crear 5 tareas, editar una, marcar otra como terminada, borrar una y comprobar la lista ordenada con `remainingMinutes` y `overdue`.

### Tests for User Story 3 ⚠️

- [X] T035 [P] [US3] Unit tests first for task ordering and derived fields (`compareTasks`: overdue → priority → deadline nulls last → createdAt → id; `isOverdue(task, now, tz)`; `remainingMinutes`) in `backend/src/tasks/task-rules.spec.ts`
- [X] T036 [P] [US3] E2E tests for contracts/tasks.md in `backend/test/tasks.e2e-spec.ts`: create 201 with derived fields, title/duration (multiple of 5, 15–1440)/priority validation 400, list order and `status` filter, PATCH fields, PATCH `status` DONE/PENDING toggles `completedAt`, DELETE 204 cascades blocks, 401, user B → 404 on GET-by-list/PATCH/DELETE of A's task
- [X] T037 [P] [US3] Component tests for the task form and list (validation, priority labels alta/media/baja, overdue badge, delete confirmation) in `frontend/src/pages/TasksPage.test.tsx`

### Implementation for User Story 3

- [X] T038 [US3] Implement `compareTasks`, `isOverdue` and `remainingMinutes` as pure functions in `backend/src/tasks/task-rules.ts`; run T035 until green
- [X] T039 [P] [US3] Create `CreateTaskDto`, `UpdateTaskDto` (adds optional `status`) and `ListTasksQueryDto` in `backend/src/tasks/dto/`
- [X] T040 [US3] Implement `TasksService` (scoped by `userId`, computes `completedMinutes` from COMPLETED blocks, `toTaskDto` with derived fields, `status` transitions with `completedAt`, reevaluates DONE when `durationMinutes` changes, cascade delete) in `backend/src/tasks/tasks.service.ts`
- [X] T041 [US3] Implement `TasksController` and `TasksModule` (export `TasksService`) in `backend/src/tasks/tasks.controller.ts` and `backend/src/tasks/tasks.module.ts`; run T036 until green
- [X] T042 [P] [US3] Add task API hooks (`useTasks`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`) in `frontend/src/api/tasks.ts`
- [X] T043 [US3] Build `TasksPage` with `TaskForm` and `TaskList` (remaining minutes, status, overdue badge, mark done/reopen, confirm before delete) in `frontend/src/pages/TasksPage.tsx`, `frontend/src/components/TaskForm.tsx`, `frontend/src/components/TaskList.tsx`; run T037 until green

**Checkpoint**: US1–US3 completas; ya hay datos suficientes para generar horarios.

---

## Phase 6: User Story 4 - Generar el horario de la semana + vista semanal (Priority: P1)

**Goal**: generar con un clic la semana con bloques de 25–50 min y 5 min de descanso, sin solapes, respetando disponibilidad y fechas límite; mostrar "sin asignar" y pintar la semana de lunes a domingo (FR-010 a FR-018).

**Independent Test**: con 2 franjas y 3 tareas, generar y comprobar el orden, los tamaños de bloque, los descansos y la lista de sin asignar; completar un bloque por API, regenerar y ver que se conserva.

### Tests for User Story 4 ⚠️

- [X] T044 [P] [US4] Unit tests first for `generateSchedule()` in `backend/src/schedule/scheduler.spec.ts` covering spec US4 scenarios 1–7 with exact times: priority order; deadline tie-break; partition 120 → 50/45/25 and 60 → 35/25; task < 25 min as one block; 5-min break between consecutive blocks and around kept blocks; no block in the past (`now` mid-week rounded up to 5); no block after a non-overdue deadline (`NO_SPACE_BEFORE_DEADLINE`); overdue tasks first with no deadline limit; `NO_SPACE` leftovers; gaps < 25 min skipped; no slots → all unassigned; no tasks → empty; determinism (same input twice → deep-equal output); a property-style check over random inputs asserting no overlaps and every block inside a slot
- [X] T045 [P] [US4] Performance unit test: 50 tasks and 14 slots generate in < 50 ms in `backend/src/schedule/scheduler.perf.spec.ts`
- [X] T046 [P] [US4] E2E tests for `GET /api/schedule` and `POST /api/schedule/generate` (contracts/schedule.md) in `backend/test/schedule.e2e-spec.ts`: `weekStart` not a Monday 400, generate 200 with blocks + `unassigned`, `hasAvailability`/`hasPendingTasks` flags, regenerate keeps COMPLETED/SKIPPED blocks (seeded) and replaces PLANNED, pending minutes discount PLANNED blocks of other weeks, 401, user B never sees or affects A's blocks
- [X] T047 [P] [US4] Component tests for `WeekGrid` (7 columns Mon–Sun, block positioned by local time, overdue styling) and the unassigned panel in `frontend/src/components/WeekGrid.test.tsx`

### Implementation for User Story 4

- [X] T048 [P] [US4] Define pure domain types `SchedulerInput`, `ScheduleResult`, `UnassignedReason` and constants `MIN_BLOCK=25`, `MAX_BLOCK=50`, `BREAK=5` in `backend/src/schedule/scheduler.types.ts`
- [X] T049 [US4] Implement `generateSchedule()` in `backend/src/schedule/scheduler.ts` per research R5 and spec FR-011–FR-017 (free intervals from slots → UTC via `common/time.ts`, clip to `now`, subtract kept blocks ±5 min, order with `compareTasks`, partition rule, deadline clipping, unassigned reasons) with no I/O; run T044 and T045 until green
- [X] T050 [P] [US4] Create `WeekQueryDto` and `GenerateScheduleDto` (`weekStart` `YYYY-MM-DD` + Monday validator) in `backend/src/schedule/dto/`
- [X] T051 [US4] Implement `ScheduleService.getWeek()` and `ScheduleService.generate()` (single Prisma transaction: delete the week's PLANNED blocks, load slots, PENDING tasks with `pendingMinutes` = duration − completed − PLANNED minutes in other weeks, kept blocks, call `generateSchedule(now, user.timezone)`, insert blocks, map to `GenerateResultDto` with task title/category/priority/overdue) in `backend/src/schedule/schedule.service.ts`
- [X] T052 [US4] Implement `ScheduleController` (`GET /schedule`, `POST /schedule/generate`) and `ScheduleModule` in `backend/src/schedule/schedule.controller.ts` and `backend/src/schedule/schedule.module.ts`; run T046 until green
- [X] T053 [P] [US4] Add schedule API hooks (`useWeek(weekStart)`, `useGenerate`) in `frontend/src/api/schedule.ts`
- [X] T054 [US4] Build `WeekGrid` and `BlockCard` (CSS grid with 7 day columns, rows by time, blocks positioned in the user's timezone, overdue badge) in `frontend/src/components/WeekGrid.tsx` and `frontend/src/components/BlockCard.tsx`
- [X] T055 [US4] Build `WeekPage` (week selector with previous/next week, "Generar horario" button, `UnassignedPanel` with minutes and reason in Spanish, empty-state messages when there are no slots or no pending tasks) in `frontend/src/pages/WeekPage.tsx` and `frontend/src/components/UnassignedPanel.tsx`; run T047 until green

**Checkpoint**: MVP núcleo (US1–US4) demostrable: cuenta → disponibilidad → tareas → horario generado.

---

## Phase 7: User Story 5 - Seguimiento de bloques (Priority: P2)

**Goal**: marcar bloques como completados, omitidos o planificados, actualizando los minutos restantes y el estado de la tarea (FR-007, FR-008, FR-019).

**Independent Test**: con un horario generado, completar un bloque y omitir otro, recargar y ver los estados persistidos; completar todos los bloques de una tarea la marca como terminada; deshacerlo la reabre.

### Tests for User Story 5 ⚠️

- [X] T056 [P] [US5] Unit tests first for `nextTaskStatus(task, completedMinutes)` (auto DONE when Σ ≥ duration; reopen when a block leaves COMPLETED and Σ < duration) in `backend/src/schedule/block-rules.spec.ts`
- [X] T057 [P] [US5] E2E tests for `PATCH /api/schedule/blocks/:id` (contracts/schedule.md) in `backend/test/blocks.e2e-spec.ts`: every status transition, response `{ block, task }` with updated `remainingMinutes`, auto-complete and reopen, invalid status 400, 401, user B → 404
- [X] T058 [P] [US5] Component test for block status actions in `BlockCard` (completar / omitir / deshacer, optimistic update and rollback on error) in `frontend/src/components/BlockCard.test.tsx`

### Implementation for User Story 5

- [X] T059 [US5] Implement `nextTaskStatus` in `backend/src/schedule/block-rules.ts`; run T056 until green
- [X] T060 [P] [US5] Create `UpdateBlockStatusDto` in `backend/src/schedule/dto/update-block-status.dto.ts`
- [X] T061 [US5] Implement `ScheduleService.updateBlockStatus()` (transaction: update the block, recompute completed minutes, apply `nextTaskStatus`, set/clear `completedAt`) and the `PATCH /schedule/blocks/:id` route in `backend/src/schedule/schedule.service.ts` and `backend/src/schedule/schedule.controller.ts`; run T057 until green
- [X] T062 [US5] Add `useUpdateBlockStatus` (invalidates `week`, `tasks` and `stats` queries) in `frontend/src/api/schedule.ts` and status action buttons with state colors in `frontend/src/components/BlockCard.tsx`; run T058 until green

**Checkpoint**: US1–US5 funcionan; el seguimiento produce datos para las métricas.

---

## Phase 8: User Story 6 - Panel de productividad (Priority: P3)

**Goal**: % de bloques completados, horas planificadas frente a completadas, tareas terminadas y racha (FR-020 a FR-022).

**Independent Test**: con bloques en estados y días conocidos, abrir el panel y comparar cada métrica con el cálculo manual (escenarios 1–4 de US6).

### Tests for User Story 6 ⚠️

- [X] T063 [P] [US6] Unit tests first for `computeWeekStats()` in `backend/src/stats/stats.spec.ts`: US6 scenarios 1–4 (60 %, 8 h / 5 h, streak 3, empty week → zeros), streak counted from yesterday when today has none, streak broken by a gap, skipped blocks count in total but not completed, rounding to an integer, local-date boundaries in a non-UTC timezone
- [X] T064 [P] [US6] E2E tests for `GET /api/stats/week` (contracts/stats.md) in `backend/test/stats.e2e-spec.ts`: values with seeded blocks/tasks, `tasksCompleted` uses `completedAt` within the week, `weekStart` not a Monday 400, 401, user B's stats ignore A's data
- [X] T065 [P] [US6] Component test for `StatsPage` (four stat cards, hours formatting, empty-week message) in `frontend/src/pages/StatsPage.test.tsx`

### Implementation for User Story 6

- [X] T066 [US6] Implement `computeWeekStats()` as a pure function in `backend/src/stats/stats.ts`; run T063 until green
- [X] T067 [US6] Implement `StatsService` (load the week's blocks, all COMPLETED block starts, tasks completed in the week, call `computeWeekStats(now, user.timezone)`), `StatsController` and `StatsModule` in `backend/src/stats/`; run T064 until green
- [X] T068 [P] [US6] Add `useWeekStats(weekStart)` in `frontend/src/api/stats.ts`
- [X] T069 [US6] Build `StatsPage` with `StatCard` components and the week selector in `frontend/src/pages/StatsPage.tsx` and `frontend/src/components/StatCard.tsx`; run T065 until green

**Checkpoint**: todas las historias funcionan de forma independiente.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: calidad transversal antes del despliegue.

- [X] T070 [P] Add loading, error and empty states to every page and a global API error toast in `frontend/src/components/` and the pages in `frontend/src/pages/`
- [X] T071 [P] Responsive pass for mobile widths (week grid scrolls horizontally per day, forms stack) in `frontend/src/components/WeekGrid.tsx` and `frontend/src/index.css`
- [X] T072 [P] Ensure the API never logs or returns `passwordHash` or tokens, and add a request-size limit and `helmet`-style headers if needed in `backend/src/main.ts`
- [X] T073 Run `npm run lint`, `npm test` and `npm run test:e2e` in `backend/` and `npm run lint` and `npm test` in `frontend/`; fix every failure
- [X] T074 Execute the manual walkthrough of `specs/001-schedule-productivity-mvp/quickstart.md` §5 locally (steps 1–9) and fix any issues found
- [X] T075 [P] Update the "Estado" section and run instructions of `README.md`

---

## Phase 10: Pull request, preview y deploy en Vercel

**Purpose**: integrar la rama a `main` con las barreras de calidad de la constitución (§Flujo:
tests en verde antes del merge, preview por PR, migraciones de producción solo después del
merge) y publicar el MVP en URLs públicas (SC-007, constitución II).

- [X] T076 [P] Add `frontend/vercel.json` with a rewrite of `/(.*)` to `/index.html` for SPA routing
- [X] T077 Create the Vercel project for the backend connected to the GitHub repo (Root Directory `backend`, framework NestJS, production branch `main`, build command `npx prisma migrate deploy && npm run build`) and link it with `vercel link` from `backend/`
- [X] T078 Install Neon Postgres from Vercel Marketplace and connect it to the backend project for Production **and** Preview with **"Create a database branch for each preview deployment" enabled**, so `prisma migrate deploy` in a preview build only touches that preview's Neon branch and the production database is migrated only by the production deploy after the merge; verify in `vercel env ls` that the Preview `DATABASE_URL` is not the production one. Then set `JWT_SECRET` (random, ≥ 32 chars, different for Production and Preview) and `CORS_ORIGIN` (production frontend domain + preview pattern from research R8) with `vercel env add`
- [X] T079 Create the Vercel project for the frontend connected to the same repo (Root Directory `frontend`, framework Vite, production branch `main`) and set `VITE_API_URL` to the backend production URL for Production and to the backend preview URL pattern/branch URL for Preview
- [ ] T080 Push the feature branch and open a pull request to `main` with `gh pr create` (summary of US1–US6 and a link to the spec); wait for both Vercel preview deployments and run the quickstart §5 walkthrough against the preview URLs; record them in the PR description — CANCELADA: la constitución v1.1.0 elimina PRs y previews; la feature se integró a main con merge directo
- [ ] T081 Merge the pull request into `main` only if T073 is green (lint + unit + e2e in both packages) and the preview walkthrough of T080 passed; never merge with failing tests (constitution §Flujo, MUST) — CANCELADA: la constitución v1.1.0 elimina PRs y previews; la feature se integró a main con merge directo
- [X] T082 Verify the production deployments triggered by the merge: `GET <backend>/api/health` → `{"status":"ok"}`, the production Neon database has the migrations applied, and the frontend loads
- [X] T083 Run the quickstart §5 walkthrough against the production URLs and record both URLs in `README.md` (follow-up commit through a new small PR or directly as allowed by the reviewer)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; can start immediately.
- **Foundational (Phase 2)**: depends on Setup and BLOCKS all user stories.
- **User Stories (Phases 3–8)**: all depend on Foundational.
- **Polish (Phase 9)**: depends on the desired stories being complete.
- **PR & Deploy (Phase 10)**: depends on Polish (T073 green). T076 can be done earlier. Strict order inside the phase: T077–T079 (Vercel + Neon with preview branching) → T080 (PR + preview check) → T081 (merge, gated by green tests) → T082–T083 (production checks). T080 and T081 were cancelled: constitution v1.1.0 removes PRs and previews, and the feature was integrated into `main` with a direct merge.

### User Story Dependencies

- **US1 (P1)**: after Foundational; no story dependencies. Every other story needs a logged-in user, but the e2e tests create users through `test/utils.ts`, so their API layer stays independently testable.
- **US2 (P1)**: after Foundational; independent of US3.
- **US3 (P1)**: after Foundational; independent of US2.
- **US4 (P1)**: needs the data from US2 (slots) and US3 (tasks, `compareTasks` in `task-rules.ts`).
- **US5 (P2)**: needs the blocks of US4.
- **US6 (P3)**: needs the blocks of US4. Its stats are only meaningful with US5, but the pure function and API are testable with seeded blocks.

```text
Setup → Foundational → US1 ─┬─ US2 ─┐
                            └─ US3 ─┴─ US4 ─┬─ US5
                                            └─ US6 → Polish → Deploy
```

### Within Each User Story

- Tests are written first and MUST fail before implementation.
- Pure functions → DTOs → services → controllers/modules → frontend hooks → pages.
- A story is complete (tests green) before moving on.

### Parallel Opportunities

- Setup: T003, T004, T005, T007 in parallel after T002.
- Foundational: T010, T011, T013, T014, T016, T018, T019, T020 in parallel after T008/T009.
- In each story, all test tasks marked [P] run together, and DTOs and frontend hooks can be done in parallel with the backend service.
- US2 and US3 can be built in parallel by two people; so can US5 and US6 after US4.

---

## Parallel Example: User Story 4

```bash
# Tests first, all together:
Task: "Unit tests for generateSchedule() in backend/src/schedule/scheduler.spec.ts"
Task: "Performance test in backend/src/schedule/scheduler.perf.spec.ts"
Task: "E2E tests in backend/test/schedule.e2e-spec.ts"
Task: "WeekGrid component tests in frontend/src/components/WeekGrid.test.tsx"

# Then in parallel with the scheduler implementation (T049):
Task: "Domain types in backend/src/schedule/scheduler.types.ts"
Task: "DTOs in backend/src/schedule/dto/"
Task: "Schedule API hooks in frontend/src/api/schedule.ts"
```

---

## Implementation Strategy

### MVP First

1. Phase 1 Setup → Phase 2 Foundational.
2. Phase 3 (US1): a usable account. **STOP and VALIDATE**.
3. Phases 4–6 (US2, US3, US4): the core value, "tu horario en un clic". **STOP and VALIDATE** with the quickstart steps 1–4. This is the minimum demonstrable MVP.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → cuentas.
3. US2 + US3 → datos de planificación.
4. US4 → horario generado (demo).
5. US5 → seguimiento.
6. US6 → panel de productividad.
7. Polish → PR con preview → merge a `main` → producción en Vercel.

Each increment keeps the previous ones working (the e2e suite stays green).

### Suggested `/speckit-implement` batches (see docs/prompts.md §8)

1. T001–T020 (Setup + Foundational)
2. T021–T034 (US1 + US2)
3. T035–T055 (US3 + US4)
4. T056–T075 (US5 + US6 + Polish)
5. T076–T083 (PR, preview, merge and production deploy; requires Vercel CLI login and `gh`)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group (commits only under the developer's identity)
- Stop at any checkpoint to validate story independently
- Open items from `checklists/api-scheduler.md` (e.g. CHK015 streak by block day, CHK022 Spanish error messages) are resolved here as: streak by the block's local `startAt` date (data-model.md) and Spanish validation messages (T015); confirm them in the checklist review
