# Horario Productivo — SDD con GitHub Spec Kit

Aplicación web que **genera tu horario semanal a partir de tus tareas y tu disponibilidad**
y **mide tu productividad**. Se construyó con **Spec-Driven Development (SDD)** usando
**[GitHub Spec Kit](https://github.com/github/spec-kit)** y un agente de IA (Claude Code):
primero se escribieron los principios, la especificación, el plan y las tareas, y el código
se derivó de esos documentos.

## 🚀 Pruébalo ya

| | |
|---|---|
| **Aplicación** | <https://horario-web-eosin.vercel.app> |
| **Email** | `demo@horario.app` |
| **Contraseña** | `Demo12345` |
| API (health) | <https://horario-api-six.vercel.app/api/health> |

El usuario de prueba existe en producción, en la base local y en cualquier base a la que se
apliquen las migraciones (ver [Usuario de prueba](#usuario-de-prueba)). Sus credenciales son
públicas: no guardes datos reales en él. También puedes crear tu propia cuenta con
**Regístrate**.

**Recorrido sugerido** (5 minutos):

1. Entra con el usuario de prueba.
2. **Disponibilidad**: añade franjas libres, por ejemplo lunes a viernes de 09:00 a 13:00.
3. **Tareas**: crea 3–5 tareas con duración, prioridad y, si quieres, fecha límite.
4. **Semana**: pulsa *Generar horario*; las tareas se reparten en bloques dentro de tus
   franjas, sin solaparse.
5. Marca algunos bloques como **completados** u **omitidos**.
6. **Productividad**: mira el % de cumplimiento, horas planificadas vs. completadas y la
   racha de días productivos.

---

# Parte 1 — Spec-Driven Development (SDD)

## ¿Qué es SDD?

En el desarrollo habitual, la especificación es un documento que se escribe al principio y
se queda obsoleto en cuanto empieza el código. En **Spec-Driven Development** ocurre al
revés: **la especificación es la fuente de verdad y el código se deriva de ella**.

- Primero se decide **qué** se construye y **por qué** (spec), sin hablar de tecnología.
- Después **cómo** se construye (plan), respetando unos principios fijos (constitución).
- Luego se trocea en **tareas** pequeñas y verificables.
- Solo entonces se escribe el código, y cada línea se puede rastrear hasta un requisito.

Si algo cambia, se cambia **primero el documento** (spec, plan o contrato) y después el
código. Así el agente de IA y las personas trabajan sobre el mismo acuerdo escrito, y se
puede comprobar en cualquier momento si el código cumple lo especificado.

### ¿Por qué SDD con un agente de IA?

Un agente de IA escribe código muy rápido, pero sin un marco claro improvisa: añade
dependencias, inventa endpoints o interpreta mal los requisitos. SDD le da ese marco:

| Problema sin SDD | Cómo lo resuelve SDD |
|------------------|----------------------|
| El agente "se inventa" cosas | Solo implementa tareas que salen de la spec y del plan |
| Requisitos ambiguos | `/speckit-clarify` pregunta antes de diseñar |
| Decisiones técnicas cambiantes | La **constitución** fija el stack y las reglas |
| Documentos que se contradicen | `/speckit-analyze` detecta incoherencias antes de programar |
| "¿Está todo hecho?" | `/speckit-converge` compara el código con la spec y añade lo que falta |

## Herramientas

- **[GitHub Spec Kit](https://github.com/github/spec-kit)** (`specify` CLI): plantillas,
  scripts y comandos para cada fase. Este repo se inicializó con
  `specify init --here --integration claude --script ps`.
- **Claude Code**: el agente que ejecuta los comandos `/speckit-*` (skills en
  `.claude/skills/`) y escribe el código.
- **[AGENTS.md](AGENTS.md)**: reglas operativas para el agente (stack, estilo, qué no puede
  tocar sin permiso). `CLAUDE.md` lo importa.

## El ciclo de SDD, fase a fase

```text
 constitución ─► specify ─► clarify ─► plan ─► checklist ─► tasks ─► analyze ─► implement ─► converge
  (principios)    (qué)     (dudas)   (cómo)   (calidad)   (pasos)  (coherencia)  (código)    (cierre)
```

| # | Fase | Comando | Qué hace | Artefacto |
|---|------|---------|----------|-----------|
| 0 | Principios | `/speckit-constitution` | Fija las reglas no negociables del proyecto: stack, testing, seguridad, flujo de trabajo | [`.specify/memory/constitution.md`](.specify/memory/constitution.md) |
| 1 | Especificar | `/speckit-specify` | Describe **qué** y **por qué** desde el punto de vista del usuario: historias, criterios de aceptación, requisitos (FR-xxx) y criterios de éxito medibles (SC-xxx). Sin tecnología | `specs/NNN-feature/spec.md` |
| 2 | Clarificar | `/speckit-clarify` | Hace hasta 5 preguntas sobre lo ambiguo y guarda las respuestas en la spec | sección *Clarifications* |
| 3 | Planificar | `/speckit-plan` | Decide **cómo**: arquitectura, decisiones técnicas razonadas, modelo de datos, contratos de API y guía de validación. Comprueba la constitución antes y después | `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md` |
| 4 | Checklist | `/speckit-checklist` | "Tests unitarios para los requisitos": revisa si la spec está completa, clara y es medible en un tema (seguridad, UX…) | `checklists/*.md` |
| 5 | Tareas | `/speckit-tasks` | Convierte el plan en tareas pequeñas, ordenadas por historia de usuario, con dependencias y paralelismo | `tasks.md` |
| 6 | Analizar | `/speckit-analyze` | Busca incoherencias entre spec, plan, tareas y constitución. **No modifica nada**: informa | informe en la conversación |
| 7 | Implementar | `/speckit-implement` | El agente ejecuta las tareas en orden, test primero donde aplica, y las marca `[X]` | código en `frontend/` y `backend/` |
| 8 | Converger | `/speckit-converge` | Compara el código con la spec y añade como tareas nuevas lo que falte | fase *Convergence* en `tasks.md` |

👉 Los prompts exactos que se usaron, en orden y listos para copiar, están en
[docs/prompts.md](docs/prompts.md).

## La constitución de este proyecto

La [constitución](.specify/memory/constitution.md) prevalece sobre cualquier otro documento.
Sus principios:

| Principio | Qué exige |
|-----------|-----------|
| I. Spec primero | Nada de código sin spec, plan y tareas; los cambios de comportamiento van antes a la spec |
| II. Stack fijo | React + Vite + TS, NestJS + TS, PostgreSQL con Prisma, Vercel + Neon, CI/CD en GitHub Actions |
| III. Núcleo testeable | El algoritmo del horario y las métricas son funciones puras con tests escritos antes (Red → Green) |
| IV. Contratos explícitos | Toda la API está documentada en `contracts/` y se valida con class-validator |
| V. Seguridad básica | bcrypt, JWT, cada usuario solo ve sus datos, sin secretos en el repo |
| VI. Simplicidad (YAGNI) | La solución más simple que cumpla la spec; la complejidad extra se justifica |

La constitución se versiona con SemVer y ha evolucionado con el proyecto:

| Versión | Cambio | Motivo |
|---------|--------|--------|
| 1.0.0 | Versión inicial | Arranque del proyecto |
| 1.1.0 | Sin pull requests ni previews; CI/CD con GitHub Actions; despliegue por paquete desde `main` | Clarificaciones de la feature 002 |
| 1.2.0 | La validación obligatoria aplica a los pushes que modifican cada paquete | Hallazgo de `/speckit-analyze` en la feature 002 |

## Cómo se aplicó SDD en este repositorio

Se desarrollaron dos features, cada una con el ciclo completo:

### Feature 001 — MVP de la aplicación ([specs/001-schedule-productivity-mvp](specs/001-schedule-productivity-mvp/))

1. **Specify** a partir de [docs/producto.md](docs/producto.md): 6 historias de usuario
   (cuenta, disponibilidad, tareas, generación del horario, seguimiento y productividad).
2. **Clarify**: se resolvieron 5 dudas, como la duración de los bloques (25–50 min), el
   descanso entre bloques o qué hacer con una tarea cuya fecha límite ya pasó.
3. **Plan**: decisiones razonadas en `research.md` (bloques tipo Pomodoro, Luxon para fechas,
   Prisma 7 con adapter-pg…), modelo de datos y **16 endpoints** documentados en `contracts/`.
4. **Tasks + Analyze**: el análisis detectó, por ejemplo, que los e2e podían tocar la base de
   desarrollo; se corrigió antes de programar.
5. **Implement**: el scheduler y las métricas se escribieron **test primero**; después
   endpoints, frontend y despliegue en Vercel.

### Feature 002 — Pipeline de CI/CD ([specs/002-ci-cd-pipeline](specs/002-ci-cd-pipeline/))

1. **Specify + Clarify**: validación por paquete en cada push y despliegue desde `main`, sin
   PR ni previews (lo que obligó a enmendar la constitución a v1.1.0).
2. **Plan**: GitHub Actions, Postgres desechable para e2e, CLI de Vercel con artefactos
   precompilados, migraciones solo desde el pipeline.
3. **Checklist** de despliegue y seguridad: detectó, entre otras cosas, que cualquier rama
   podía usar los secretos de producción.
4. **Analyze**: 2 problemas críticos y 2 altos. Se corrigieron en la spec (requisitos nuevos
   FR-013b, FR-019a, FR-021), en el plan (GitHub Environment `production` limitado a `main`)
   y en la constitución (v1.2.0). Un segundo análisis quedó sin problemas críticos.
5. **Implement**: workflows, escenarios de fallo probados en ramas desechables y despliegue
   real a producción.

Cada feature deja en su carpeta `specs/NNN-…/` toda la trazabilidad: qué se pidió, qué se
decidió y por qué, y qué tareas lo implementan.

## Reproducir el flujo SDD

Requisitos: Git, Python 3.11+, [uv](https://docs.astral.sh/uv/), Node 24, Claude Code.

```bash
# 1. Instalar la CLI de Spec Kit (una sola vez)
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# 2. Clonar el repo
git clone https://github.com/marianZamorano/sdd-horario-productividad.git
cd sdd-horario-productividad

# 3. Verificar herramientas
specify check
```

El repo ya está inicializado: abre la carpeta en VS Code con Claude Code y sigue
[docs/prompts.md](docs/prompts.md) desde el paso 1.

---

# Parte 2 — El proyecto implementado

## Qué hace la aplicación

Quien estudia o trabaja tiene muchas tareas y poco tiempo libre. Horario Productivo:

1. **Genera el horario**: indicas tu **disponibilidad semanal** (franjas libres por día) y
   tus **tareas** (duración, prioridad y fecha límite opcional). Con un clic, el sistema
   reparte las tareas en **bloques de trabajo con descansos**, de la más prioritaria y
   urgente a la menos, **sin solapes** y siempre dentro de tus franjas. El resultado es
   determinista: con los mismos datos, el mismo horario.
2. **Controla la productividad**: marcas cada bloque como **completado** u **omitido**, y un
   panel muestra el **% de cumplimiento**, las **horas planificadas vs. completadas**, las
   **tareas terminadas** y la **racha** de días productivos.

| Pantalla | Para qué sirve |
|----------|----------------|
| Iniciar sesión / Registro | Cuenta propia con email y contraseña |
| Disponibilidad | Franjas libres de cada día de la semana |
| Tareas | Alta, edición y borrado de tareas |
| Semana | Generar el horario y marcar bloques |
| Productividad | Métricas de la semana |

Alcance completo del MVP: [docs/producto.md](docs/producto.md) y
[spec de la feature 001](specs/001-schedule-productivity-mvp/spec.md).

## Arquitectura

```text
 Navegador ──► horario-web (Vercel, SPA estática)
                    │  fetch + JWT  (VITE_API_URL)
                    ▼
              horario-api (Vercel Function, NestJS)  ──►  Neon Postgres (horario-db)
                    │  Prisma 7 + adapter-pg
```

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS v4 |
| Backend | NestJS 11 + TypeScript, Prisma 7, class-validator, bcrypt, JWT, Luxon |
| Base de datos | PostgreSQL: Neon en producción (Vercel Marketplace), `postgres:17` en local |
| Despliegue | Vercel: un proyecto para el frontend (`horario-web`) y otro para el backend (`horario-api`) |
| CI/CD | GitHub Actions |

Más detalle: [docs/arquitectura.md](docs/arquitectura.md) (y el diagrama
[docs/arquitectura.excalidraw](docs/arquitectura.excalidraw)).

**Decisiones clave**

- El **algoritmo del horario** (`backend/src/schedule/scheduler.ts`) y las **métricas**
  (`backend/src/stats/stats.ts`) son funciones puras: no tocan base de datos, red ni reloj,
  por eso se prueban en milisegundos.
- La API REST tiene **16 endpoints** bajo `/api`, documentados en
  [contracts/](specs/001-schedule-productivity-mvp/contracts/README.md). Todo DTO se valida
  y los campos desconocidos se rechazan.
- **Seguridad**: contraseñas con bcrypt, JWT en cada petición, cada consulta filtrada por
  usuario (un recurso ajeno responde 404) y CORS limitado al origen exacto del frontend.

## Estructura del repositorio

```text
.
├── README.md
├── AGENTS.md / CLAUDE.md      # Reglas para el agente de IA
├── docs/                      # Producto, arquitectura, diagrama y prompts del SDD
├── specs/
│   ├── 001-schedule-productivity-mvp/   # Spec, plan, contratos y tareas del MVP
│   └── 002-ci-cd-pipeline/              # Spec, plan, contratos y tareas del pipeline
├── .specify/                  # Spec Kit: constitución, plantillas y scripts
├── .claude/skills/            # Comandos /speckit-* para Claude Code
├── .github/workflows/         # backend.yml, frontend.yml, integration.yml
├── backend/                   # API NestJS + Prisma (proyecto Vercel horario-api)
│   ├── prisma/                # schema.prisma y migraciones (incluye el usuario de prueba)
│   ├── src/                   # módulos: auth, availability, tasks, schedule, stats, health
│   └── test/                  # tests e2e con supertest
├── frontend/                  # SPA React + Vite (proyecto Vercel horario-web)
└── docker-compose.yml         # Postgres 17 local (bases horario y horario_test)
```

## Ejecutar en local

Requisitos: Node 24 LTS (mínimo 20.19) y Docker Desktop.

```bash
# Postgres 17 en el puerto 5433 (bases horario y horario_test)
docker compose up -d

# Backend: http://localhost:3000/api
cd backend
cp .env.example .env
npm install
npx prisma migrate dev      # crea las tablas y el usuario de prueba
npm run start:dev

# Frontend: http://localhost:5173 (en otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Abre <http://localhost:5173> y entra con **`demo@horario.app` / `Demo12345`**.

> En local, `backend/.env` tiene prioridad sobre las variables de entorno globales del
> sistema (por ejemplo, un `DATABASE_URL` de otro proyecto).

## Usuario de prueba

| Email | Contraseña |
|-------|-----------|
| `demo@horario.app` | `Demo12345` |

Lo crea la migración
[`20261026180000_seed_demo_user`](backend/prisma/migrations/20261026180000_seed_demo_user/migration.sql)
(requisito FR-022 de la spec 002), que guarda solo el hash bcrypt de la contraseña. Al ser
una migración, existe en todas las bases:

| Base | Cómo se crea |
|------|--------------|
| Local (`horario`) | `npx prisma migrate dev` o `npx prisma migrate deploy` en `backend/` |
| Producción (Neon) | La aplica el job `backend / deploy` del pipeline en cada push a `main` |
| CI y tests | Se aplica al preparar la base desechable (los e2e vacían las tablas en cada suite) |

Es **idempotente**: si ya existe un usuario con ese email, no lo modifica. Empieza sin
datos; crea tu disponibilidad y tus tareas desde la app. Como las credenciales son
públicas, cualquiera puede ver y cambiar sus datos.

## Tests

| Paquete | Comando | Qué cubre |
|---------|---------|-----------|
| Backend | `npm test` | 96 tests unitarios: scheduler, métricas, CORS y utilidades |
| Backend | `npm run test:e2e` | 70 tests e2e de todos los endpoints contra la base `horario_test`: caso feliz, validación, 401 y acceso a datos ajenos |
| Frontend | `npm test` | 31 tests con Vitest + Testing Library |

Antes de hacer push a `main`, ejecuta el lint sin autocorrección (`npm run lint:ci` en
`backend/`, `npm run lint` en `frontend/`) y los tests de los paquetes que tocaste. Guía de
validación funcional completa:
[specs/001-schedule-productivity-mvp/quickstart.md](specs/001-schedule-productivity-mvp/quickstart.md).

## CI/CD (GitHub Actions)

| Workflow | Cuándo | Qué hace |
|----------|--------|----------|
| `backend` | push a cualquier rama que toque `backend/` | `validate`: lint, unit, e2e contra Postgres desechable, build y prueba de arranque. En `main`, además `deploy`: migraciones y despliegue de `horario-api` |
| `frontend` | push a cualquier rama que toque `frontend/` | `validate`: lint, unit, build y prueba de arranque. En `main`, además `deploy` de `horario-web` |
| `integration` | push a `main` | Backend y frontend compilados juntos: health, frontend servido y CORS (informativo, no bloquea) |

- Si falla cualquier paso de `validate`, ese paquete **no se despliega**; el otro sí, si
  está en verde.
- Las otras ramas solo se validan, nunca despliegan.
- Cada despliegue aparece en el repositorio en **Deployments → production**, con enlace a
  la app.
- Si Vercel falla al desplegar, se reintenta una vez. Después se comprueba que producción
  responde.

Detalle en [specs/002-ci-cd-pipeline/contracts/ci-workflows.md](specs/002-ci-cd-pipeline/contracts/ci-workflows.md).

> Relanzar a mano ("Re-run") una ejecución antigua de `main` vuelve a desplegar ese commit
> y sus migraciones; para recuperarse de un fallo es preferible hacer push de un arreglo.

### Despliegue en Vercel

- Dos proyectos: `horario-web` y `horario-api`, ambos con Root Directory `.`, desplegados
  desde `frontend/` y `backend/`.
- Neon Postgres (`horario-db`) instalado desde Vercel Marketplace y conectado **solo** al
  entorno Production de `horario-api`.
- **Solo despliega el pipeline** desde `main`. Los proyectos de Vercel **no están
  conectados a Git** (`vercel git disconnect`): con Root Directory `.`, una conexión Git
  despliega la raíz del repo, que está vacía, y pisaría la versión buena. No vuelvas a
  conectarlos.
- Las migraciones las aplica el job `backend / deploy` con `prisma migrate deploy` antes de
  desplegar; el build de Vercel ya no migra.

### Secretos

Viven en el GitHub Environment **`production`** (Settings → Environments), que solo admite
la rama `main`; no hay secretos a nivel de repositorio. Se cargan con
`gh secret set <NOMBRE> --env production` (el valor por stdin, nunca en el repo):

| Secreto | Cómo obtenerlo |
|---------|----------------|
| `VERCEL_TOKEN_API` | Token de proyecto (`vcp_…`) de `horario-api`: Vercel → `horario-api` → Settings → Tokens |
| `VERCEL_TOKEN_WEB` | Token de proyecto (`vcp_…`) de `horario-web`: Vercel → `horario-web` → Settings → Tokens |
| `VERCEL_ORG_ID` | `orgId` de `backend/.vercel/project.json` |
| `VERCEL_PROJECT_ID_API` | `projectId` de `backend/.vercel/project.json` |
| `VERCEL_PROJECT_ID_WEB` | `projectId` de `frontend/.vercel/project.json` |
| `PROD_DATABASE_URL` | `DATABASE_URL_UNPOOLED` del entorno Production de `horario-api` (conexión directa de Neon, sin `-pooler`) |

## Estado

- [x] Repositorio SDD inicializado con Spec Kit (integración Claude, scripts PowerShell)
- [x] Visión de producto, arquitectura y diagrama
- [x] Constitución v1.2.0 (`/speckit-constitution`)
- [x] Feature 001: spec, clarificación, plan, checklist, tareas y análisis del MVP
  ([specs/001-schedule-productivity-mvp](specs/001-schedule-productivity-mvp/))
- [x] Implementación del MVP: cuenta, disponibilidad, tareas, generador de horario, vista
  semanal, seguimiento de bloques y panel de productividad
- [x] Deploy en Vercel con Neon Postgres y flujo completo verificado en producción
- [x] Feature 002: pipeline de CI/CD con validación por paquete, despliegue automático desde
  `main` e integración ([specs/002-ci-cd-pipeline](specs/002-ci-cd-pipeline/))
- [x] Usuario de prueba disponible en local y en producción
