# Implementation Plan: Pipeline de CI/CD

**Branch**: `002-ci-cd-vercel` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

> La rama de Git es `002-ci-cd-vercel`; la carpeta de la spec es `specs/002-ci-cd-pipeline`
> (los scripts de Spec Kit toman el nombre de la carpeta). Ambos nombres se refieren a esta
> feature.

**Input**: Feature specification from `/specs/002-ci-cd-pipeline/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Pipeline de GitHub Actions que valida cada push por paquete y despliega a producción desde
`main`, sustituyendo los despliegues manuales y el auto-deploy por Git de Vercel. Tres
workflows: `backend.yml` y `frontend.yml` (push a cualquier rama que toque su paquete; job
`validate` con lint, tests unitarios, e2e del backend contra un `postgres:17` desechable,
build y prueba de arranque; job `deploy` dependiente, solo en `main` y en el GitHub
Environment `production` (el único que guarda los secretos), con la CLI de Vercel
`pull` → `build --prod` → `deploy --prebuilt --prod`, un reintento, y en el backend
`prisma migrate deploy` contra Neon antes de desplegar) e `integration.yml` (push a `main`,
informativo: backend y frontend compilados juntos, health, frontend servido y CORS). Los
`vercel.json` desactivan el auto-deploy y el build del backend deja de migrar. Se retira el
comodín de CORS que solo servía a los previews. Sin dependencias npm nuevas. Decisiones en
[research.md](research.md).

## Technical Context

**Language/Version**: YAML de GitHub Actions + bash (runner `ubuntu-latest`). Node 24 en
todos los jobs, la versión de los proyectos de Vercel (R3). TypeScript `strict` en el único
cambio de código (`cors.ts`).

**Primary Dependencies**: `actions/checkout`, `actions/setup-node` (caché npm), service
container `postgres:17` (la misma imagen que `docker-compose.yml`), GitHub Environment
`production`, Vercel CLI `vercel@65.2.0` instalada en el runner (no en los
`package.json`), `curl`. Ninguna dependencia npm nueva.

**Storage**: Postgres desechable por job (service container) para e2e, arranque e
integración; Neon de producción solo en `backend / deploy` vía `PROD_DATABASE_URL`. Sin
cambios de esquema ([data-model.md](data-model.md)).

**Testing**: los suites existentes (Jest + supertest en backend, Vitest en frontend) más
las comprobaciones HTTP de [contracts/smoke-checks.md](contracts/smoke-checks.md). La
validación del propio pipeline es manual, según [quickstart.md](quickstart.md). Se adapta
`cors.spec.ts` al cambio de CORS.

**Target Platform**: GitHub Actions (hosted runners) → Vercel (`horario-api` como Vercel
Function Node 24, `horario-web` estático), Neon Postgres.

**Project Type**: infraestructura de CI/CD para una aplicación web de dos paquetes.

**Performance Goals**: cada `validate` < 5 min (SC-003a); push a `main` → producción
≤ 15 min (SC-003).

**Constraints**: `timeout-minutes: 10` por job; secretos solo como secretos del Environment
`production`, accesible únicamente desde `main` (FR-019a), y enmascarados en logs; solo
`main` despliega o migra; ejecuciones de `main` serializadas por paquete sin cancelar las
que estén en curso.

**Scale/Scope**: 3 workflows, 5 jobs, 5 secretos, 2 proyectos de Vercel; un repositorio y un
pequeño equipo que sube directo a `main`.

No quedan puntos NEEDS CLARIFICATION.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo cumple este plan | Pre-diseño | Post-diseño |
|-----------|--------------------------|:----------:|:-----------:|
| I. Spec primero | Spec clarificada (sesión 2026-10-26) y corregida tras `/speckit-analyze`; este plan y `tasks.md` preceden a los workflows. El único cambio de código (CORS) está en la spec como FR-021 (R13) | ✅ | ✅ |
| II. Stack fijo | GitHub Actions como CI/CD; despliegues a Vercel solo desde el pipeline y auto-deploy por Git desactivado en ambos `vercel.json` (R11). Sin cambios en frontend, backend, Prisma ni Neon | ✅ | ✅ |
| III. Núcleo testeable | No toca el scheduler ni las métricas; el pipeline ejecuta sus unit tests y todos los e2e en cada push del backend | ✅ | ✅ |
| IV. Contratos explícitos | Sin endpoints nuevos ni modificados; las comprobaciones HTTP del pipeline se documentan en `contracts/smoke-checks.md` y la interfaz de los workflows en `contracts/ci-workflows.md` | ✅ | ✅ |
| V. Seguridad básica | Token, IDs y URL de producción solo como secretos del Environment `production`, restringido a `main` y enmascarados en logs; README con nombres sin valores (R12). CORS más estricto: orígenes exactos (R13) | ✅ | ✅ |
| VI. Simplicidad | Sin workflows reutilizables, acciones de terceros para Vercel ni dependencias npm; un único Environment, justificado por FR-019a; lógica de espera con `curl` en línea (R6, R9, R12). Se elimina el comodín de CORS | ✅ | ✅ |
| Restricciones | Lint sin `--fix` en CI (`lint:ci`, R4); TS strict en `cors.ts`; identificadores en inglés y nombres de pasos y mensajes de error en español; configuración por variables de entorno | ✅ | ✅ |
| Flujo (v1.2.0) | Cada push que modifica un paquete se valida con su flujo (filtro de rutas, permitido desde la v1.2.0); solo `main` despliega, por paquete y solo con `validate` en verde (`needs`) y el Environment `production`; las migraciones solo las aplica `backend / deploy` (se quitan del `buildCommand`); sin PR ni previews | ✅ | ✅ |

**Resultado**: GATE superado antes y después del diseño. No hay violaciones que justificar.

Historial: `/speckit-analyze` detectó dos conflictos con la constitución (C1: filtro de
rutas frente a "cada push MUST validarse"; C2: cambio de CORS ausente en la spec). C1 se
resolvió con la enmienda v1.2.0 y C2 con FR-021.

## Project Structure

### Documentation (this feature)

```text
specs/002-ci-cd-pipeline/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones técnicas (R1–R13)
├── data-model.md        # Fase 1: flujos, despliegues, secretos, config versionada
├── quickstart.md        # Fase 1: configuración manual y escenarios de validación
├── contracts/
│   ├── ci-workflows.md  # disparadores, jobs, pasos, concurrencia, secretos
│   └── smoke-checks.md  # comprobaciones HTTP (health, SPA, CORS)
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks; no lo crea este comando)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── backend.yml           # NUEVO: validate (postgres:17) → deploy (main, Environment production)
    ├── frontend.yml          # NUEVO: validate → deploy (main, Environment production)
    └── integration.yml       # NUEVO: solo push a main; backend :3001 + frontend :4173

backend/
├── vercel.json               # git.deploymentEnabled: false; buildCommand: npm run build
├── package.json              # + script lint:ci (ESLint sin --fix)
├── .env.example              # comentario de CORS_ORIGIN sin comodín
└── src/common/
    ├── cors.ts               # orígenes exactos (sin comodín *)
    └── cors.spec.ts          # sin el caso de previews

frontend/
└── vercel.json               # git.deploymentEnabled: false

README.md                     # secretos del pipeline (sin valores), "Demo en producción"
                              # (despliegue y migraciones por el pipeline, Root Directory "."),
                              # sección Estado
```

**Structure Decision**: los workflows viven en `.github/workflows/` (única ubicación que
admite GitHub) y operan sobre los dos paquetes independientes sin cambiar su estructura. Cada
job de paquete trabaja con `working-directory` en `backend/` o `frontend/`, coherente con los
proyectos de Vercel (Root Directory `.`, desplegados desde su carpeta). No se crean scripts
compartidos ni workflows reutilizables (R6, R1).

## Complexity Tracking

Sin violaciones de la constitución; no aplica.
