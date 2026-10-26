# Horario Productivo — SDD con GitHub Spec Kit

Repositorio de **Spec-Driven Development (SDD)** para construir una aplicación web
que **genera tu horario semanal y controla tu productividad**. El desarrollo se
guía con **[GitHub Spec Kit](https://github.com/github/spec-kit)** (`specify` CLI):
primero se escriben principios, especificación, plan y tareas, y después un agente
de IA (Claude Code) implementa el código a partir de esos artefactos.

## ¿De qué trata el producto?
Quien estudia o trabaja tiene muchas tareas y poco tiempo libre. La app:

1. **Genera el horario**: el usuario indica su disponibilidad semanal (franjas
   libres por día) y sus tareas (duración, prioridad, fecha límite). Con un clic
   el sistema reparte las tareas en los huecos libres, de la más prioritaria y
   urgente a la menos, sin solapes.
2. **Controla la productividad**: cada bloque se marca como completado u omitido,
   y un panel muestra el % de cumplimiento, las horas planificadas frente a las
   completadas, las tareas terminadas y la racha de días productivos.

Detalle completo del alcance del mini-MVP: [docs/producto.md](docs/producto.md).

## Stack tecnológico
| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite + TypeScript |
| Backend | NestJS + TypeScript + Prisma |
| Base de datos | PostgreSQL (Neon, desde Vercel Marketplace) |
| Despliegue | Vercel: un proyecto para el frontend y otro para el backend |
| SDD | GitHub Spec Kit + Claude Code |

Arquitectura y diagrama de Excalidraw: [docs/arquitectura.md](docs/arquitectura.md) ·
[docs/arquitectura.excalidraw](docs/arquitectura.excalidraw).

## ¿Qué es SDD y cómo se usa aquí?
En Spec-Driven Development la **especificación es la fuente de verdad**: el código
se deriva de ella y no al revés. Spec Kit organiza el trabajo en fases, cada una
con un comando del agente:

| Fase | Comando | Artefacto generado |
|------|---------|--------------------|
| Principios | `/speckit-constitution` | `.specify/memory/constitution.md` |
| Qué y por qué | `/speckit-specify` | `specs/NNN-feature/spec.md` |
| Dudas | `/speckit-clarify` | sección *Clarifications* en `spec.md` |
| Cómo | `/speckit-plan` | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| Calidad (opcional) | `/speckit-checklist` | `checklists/*.md` |
| Tareas | `/speckit-tasks` | `tasks.md` |
| Coherencia | `/speckit-analyze` | informe (no modifica archivos) |
| Código | `/speckit-implement` | `frontend/`, `backend/` |
| Cierre | `/speckit-converge` | tareas pendientes añadidas a `tasks.md` |

👉 La **lista de prompts listos para copiar** está en [docs/prompts.md](docs/prompts.md).

## Estructura del repositorio
```
.
├── AGENTS.md              # Reglas para agentes de IA (stack, estilo, reglas)
├── CLAUDE.md              # Importa AGENTS.md para Claude Code
├── README.md
├── docs/
│   ├── producto.md        # Visión y alcance del mini-MVP (entrada de /speckit-specify)
│   ├── arquitectura.md    # Arquitectura objetivo y decisiones
│   ├── arquitectura.excalidraw  # Diagrama editable en excalidraw.com
│   └── prompts.md         # Prompts en orden para probar el SDD
├── specs/                 # Lo crea /speckit-specify (una carpeta por feature)
├── .specify/              # Spec Kit: constitución, plantillas, scripts PowerShell
└── .claude/skills/        # Skills /speckit-* para Claude Code
```

## Puesta en marcha
Requisitos: Git, Python 3.11+, [uv](https://docs.astral.sh/uv/), Node 20+, Claude Code.

```bash
# 1. Instalar la CLI de Spec Kit (una sola vez)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# 2. Clonar el repo
git clone https://github.com/marianZamorano/sdd-horario-productividad.git
cd sdd-horario-productividad

# 3. Verificar herramientas
specify check
```

Este repo ya está inicializado con
`specify init --here --integration claude --script ps`, así que no hace falta
volver a ejecutarlo. Abre la carpeta en VS Code con Claude Code y sigue
[docs/prompts.md](docs/prompts.md) desde el paso 1.

## Demo en producción (Vercel)

| Parte | URL |
|-------|-----|
| Aplicación (frontend) | <https://horario-web-eosin.vercel.app> |
| API (backend) | <https://horario-api-six.vercel.app/api> · health: [`/api/health`](https://horario-api-six.vercel.app/api/health) |

Dos proyectos de Vercel (`horario-web` y `horario-api`, ambos con Root Directory `.` y
desplegados desde `frontend/` y `backend/`) y Neon Postgres (`horario-db`) instalado desde
Vercel Marketplace y conectado solo al entorno Production de `horario-api`.

Solo despliega el pipeline de GitHub Actions desde `main` (el auto-deploy por Git de Vercel
está desactivado). Las migraciones las aplica el job `backend / deploy` con
`prisma migrate deploy` antes de desplegar; el build de Vercel ya no migra. Cada despliegue
aparece en el repositorio en **Deployments → production**.

> Relanzar a mano ("Re-run") una ejecución antigua de `main` vuelve a desplegar ese commit
> y sus migraciones; para recuperarse de un fallo es preferible hacer push de un arreglo.

## CI/CD (GitHub Actions)

| Workflow | Cuándo | Qué hace |
|----------|--------|----------|
| `backend` | push a cualquier rama que toque `backend/` | `validate`: lint, unit, e2e contra Postgres desechable, build y prueba de arranque. En `main`, además `deploy`: migraciones y despliegue de `horario-api` |
| `frontend` | push a cualquier rama que toque `frontend/` | `validate`: lint, unit, build y prueba de arranque. En `main`, además `deploy` de `horario-web` |
| `integration` | push a `main` | backend y frontend compilados juntos: health, frontend servido y CORS (informativo, no bloquea) |

Detalle en [specs/002-ci-cd-pipeline/contracts/ci-workflows.md](specs/002-ci-cd-pipeline/contracts/ci-workflows.md).

Los secretos viven en el GitHub Environment **`production`** (Settings → Environments),
que solo admite la rama `main`; no hay secretos a nivel de repositorio. Se cargan con
`gh secret set <NOMBRE> --env production` (el valor por stdin, nunca en el repo):

| Secreto | Cómo obtenerlo |
|---------|----------------|
| `VERCEL_TOKEN_API` | Token de proyecto (`vcp_…`) de `horario-api`: Vercel → `horario-api` → Settings → Tokens |
| `VERCEL_TOKEN_WEB` | Token de proyecto (`vcp_…`) de `horario-web`: Vercel → `horario-web` → Settings → Tokens |
| `VERCEL_ORG_ID` | `orgId` de `backend/.vercel/project.json` |
| `VERCEL_PROJECT_ID_API` | `projectId` de `backend/.vercel/project.json` |
| `VERCEL_PROJECT_ID_WEB` | `projectId` de `frontend/.vercel/project.json` |
| `PROD_DATABASE_URL` | `DATABASE_URL_UNPOOLED` del entorno Production de `horario-api` (conexión directa de Neon, sin `-pooler`) |

## Ejecutar el MVP en local
Requisitos: Node 20.19+ (recomendado 24 LTS) y Docker Desktop.

```bash
# Postgres 17 en el puerto 5433 (bases horario y horario_test)
docker compose up -d

# Backend: http://localhost:3000/api
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run start:dev

# Frontend: http://localhost:5173 (en otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Tests: `npm test` en `backend/` y `frontend/`; e2e del backend con `npm run test:e2e`
(usan solo la base `horario_test`). Antes de hacer push a `main`, ejecuta en los paquetes
afectados el lint sin autocorrección (`npm run lint:ci` en `backend/`, `npm run lint` en
`frontend/`) y los tests. Guía de validación completa:
[specs/001-schedule-productivity-mvp/quickstart.md](specs/001-schedule-productivity-mvp/quickstart.md).

> En local, `backend/.env` tiene prioridad sobre variables de entorno globales del sistema
> (por ejemplo, un `DATABASE_URL` de otro proyecto).

## Estado
- [x] Repositorio SDD inicializado con Spec Kit (integración Claude, scripts PowerShell)
- [x] Visión de producto, arquitectura y diagrama
- [x] Constitución v1.2.0 (`/speckit-constitution`)
- [x] Spec, clarificación, plan, checklist, tareas y análisis del MVP
  ([specs/001-schedule-productivity-mvp](specs/001-schedule-productivity-mvp/))
- [x] Implementación del MVP: cuenta, disponibilidad, tareas, generador de horario, vista
  semanal, seguimiento de bloques y panel de productividad (T000–T075)
- [x] Deploy en Vercel con Neon Postgres y flujo completo verificado en producción
- [ ] CI/CD: el flujo PR + preview (T080–T081) se descartó en la constitución v1.1.0; el
  pipeline se define en [specs/002-ci-cd-pipeline](specs/002-ci-cd-pipeline/) (pendiente
  de implementar)
