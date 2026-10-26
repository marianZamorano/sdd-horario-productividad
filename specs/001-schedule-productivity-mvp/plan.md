# Implementation Plan: Mini-MVP Horario Productivo

**Branch**: `001-schedule-productivity-mvp` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-schedule-productivity-mvp/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Aplicación web en la que un usuario autenticado define su disponibilidad semanal y sus
tareas, genera con un clic un horario semanal de bloques Pomodoro (25–50 min con 5 min de
descanso), marca los bloques como completados u omitidos y consulta métricas de
productividad. Enfoque técnico: monorepo con dos paquetes independientes. `frontend/` es
una SPA React 18 + Vite que consume la API REST documentada en `contracts/`. `backend/` es
NestJS + Prisma sobre PostgreSQL. El núcleo (algoritmo de generación y métricas) son
funciones puras testeadas con Jest. Despliegue en dos proyectos Vercel con Neon Postgres
desde el Marketplace. Detalle de las decisiones en [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x en modo `strict`; Node.js 24 LTS (mínimo 20.19).

**Primary Dependencies**:
- Backend: NestJS 11 (`@nestjs/core`, `@nestjs/jwt`, `@nestjs/config`), Prisma ORM 7.x +
  `@prisma/adapter-pg`, `bcrypt`, `class-validator` + `class-transformer`, `luxon`.
- Frontend: React 18.3, Vite, React Router, TanStack Query, Tailwind CSS v4.

**Storage**: PostgreSQL. Producción en Neon (Vercel Marketplace); local en `postgres:17`
vía docker-compose. Esquema en [data-model.md](data-model.md).

**Testing**:
- Backend: Jest (unit de `scheduler.ts` y `stats.ts`, test-first) y Jest + supertest (e2e
  contra `horario_test`).
- Frontend: Vitest + Testing Library.

**Target Platform**: navegadores modernos de escritorio y móvil (SPA); backend como una
Vercel Function (Fluid Compute, Node.js).

**Project Type**: aplicación web (frontend SPA + backend API REST).

**Performance Goals**: generar una semana con 50 tareas en < 1 s de punta a punta
(SC-002); el algoritmo por sí solo, < 50 ms.

**Constraints**:
- Sin solapes, siempre dentro de la disponibilidad y respetando las fechas límite (SC-003).
- Resultado determinista (FR-017).
- Aislamiento total entre usuarios (SC-005).
- Body de la request < 4,5 MB (límite de Vercel; no aplica en la práctica).
- Sin secretos en el repo.

**Scale/Scope**: MVP académico, decenas de usuarios; ~100 tareas y ~200 bloques por
usuario; 6 pantallas (Login, Registro, Disponibilidad, Tareas, Semana, Productividad);
16 endpoints.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple este plan | Pre-diseño | Post-diseño |
|-----------|--------------------------|:----------:|:-----------:|
| I. Spec primero | Spec clarificada (sesión 2026-10-26); este plan y `tasks.md` preceden a cualquier código | ✅ | ✅ |
| II. Stack fijo | React + Vite + TS en `/frontend`; NestJS + TS en `/backend`; Postgres + Prisma; 2 proyectos Vercel + Neon. Las librerías añadidas (Luxon, TanStack Query, React Router, Tailwind) son dependencias dentro del stack, no lo cambian | ✅ | ✅ |
| III. Núcleo testeable | `generateSchedule()` y `computeWeekStats()` son puras (reciben `now` y `timezone`); los unit tests de Jest van antes que la implementación; e2e con supertest para cada endpoint (caso feliz, validación, 401 y acceso ajeno) | ✅ | ✅ |
| IV. Contratos explícitos | 16 endpoints documentados en `contracts/`; `ValidationPipe` global con `whitelist` + `forbidNonWhitelisted`; el cliente del frontend tipado según los contratos | ✅ | ✅ |
| V. Seguridad básica | bcrypt (coste 10); JWT con un guard global y `@Public()`; filtro `userId` + 404 en recursos ajenos; `.env` ignorado, `.env.example` y variables de Vercel | ✅ | ✅ |
| VI. Simplicidad | Sin workspaces, sin librería de calendario, sin refresh tokens ni RLS; los valores del algoritmo son constantes | ✅ | ✅ |
| Restricciones | TS strict, ESLint + Prettier en ambos paquetes, código en inglés, UI en español, configuración por variables de entorno | ✅ | ✅ |
| Flujo | Toda la implementación va en la rama `001-schedule-productivity-mvp` (T000); se integra a `main` solo mediante un PR (T080) con preview de Vercel de frontend y backend y merge condicionado a lint + unit + e2e en verde (T073, T081). Las migraciones: `migrate deploy` corre en cada build, pero Neon está configurado con **una rama de BD por preview** (T078), así que un PR solo migra su rama y la BD de producción se migra únicamente en el deploy de producción que dispara el merge | ✅ | ✅ |

Nota: en la primera evaluación la rama no existía (no hay extensión de Git y el trabajo previo
se hizo en `main`). Se corrigió tras `/speckit-analyze` (hallazgos C1 y C2): la rama se creó y
tasks.md incorpora las tareas de PR, preview, merge y la configuración de ramas de preview en
Neon.

**Resultado**: GATE superado. No hay violaciones que justificar.

## Project Structure

### Documentation (this feature)

```text
specs/001-schedule-productivity-mvp/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones técnicas
├── data-model.md        # Fase 1: entidades, estados, tipos puros
├── quickstart.md        # Fase 1: guía de validación de punta a punta
├── contracts/           # Fase 1: contrato REST por módulo
│   ├── README.md
│   ├── auth.md
│   ├── availability.md
│   ├── tasks.md
│   ├── schedule.md
│   └── stats.md
├── checklists/
│   ├── requirements.md
│   └── api-scheduler.md
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
docker-compose.yml               # postgres:17 (horario, horario_test)

backend/                         # Proyecto Vercel #2 (Root Directory: backend)
├── package.json                 # build: prisma generate && nest build
├── prisma.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── .env.example
├── src/
│   ├── main.ts                  # entrypoint detectado por Vercel; prefijo /api, CORS, ValidationPipe
│   ├── app.module.ts
│   ├── prisma/                  # PrismaService (adapter-pg)
│   ├── common/                  # @Public(), @CurrentUser(), utilidades de semana/zona (Luxon)
│   ├── health/
│   ├── auth/                    # controller, service, dto, jwt.guard
│   ├── availability/
│   ├── tasks/
│   ├── schedule/
│   │   ├── scheduler.ts         # generateSchedule(): función pura
│   │   ├── scheduler.spec.ts    # unit tests (escritos primero)
│   │   ├── schedule.service.ts  # orquesta la transacción + scheduler
│   │   └── schedule.controller.ts
│   └── stats/
│       ├── stats.ts             # computeWeekStats(): función pura
│       ├── stats.spec.ts
│       └── stats.controller.ts
└── test/                        # e2e supertest por módulo + helpers (usuarios A/B)

frontend/                        # Proyecto Vercel #1 (Root Directory: frontend)
├── package.json
├── vite.config.ts               # React + @tailwindcss/vite
├── vercel.json                  # rewrite SPA → /index.html
├── .env.example                 # VITE_API_URL
└── src/
    ├── main.tsx / App.tsx       # router + QueryClientProvider
    ├── api/                     # client.ts (fetch tipado, token, 401) + types.ts (según contracts/)
    ├── auth/                    # contexto de sesión, ruta protegida
    ├── pages/                   # Login, Register, Availability, Tasks, Week, Stats
    ├── components/              # WeekGrid, BlockCard, TaskForm, SlotForm, StatCard…
    └── lib/                     # utilidades de fecha (lunes de la semana, formato hh:mm)
```

**Structure Decision**: aplicación web en dos paquetes npm independientes (`frontend/` y
`backend/`), cada uno con su `package.json` y desplegado como un proyecto Vercel propio
(constitución II). La lógica de negocio pura vive en `backend/src/schedule/scheduler.ts` y
`backend/src/stats/stats.ts`, aislada de controladores y servicios para testearla sin BD.
Los tipos de la API se duplican deliberadamente en `frontend/src/api/types.ts` en lugar de
crear un paquete compartido (YAGNI, ver R9 y R10).

## Complexity Tracking

Sin violaciones de la constitución; no aplica.
