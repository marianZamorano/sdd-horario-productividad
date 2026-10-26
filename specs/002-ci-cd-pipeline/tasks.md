---

description: "Task list for the CI/CD pipeline feature"
---

# Tasks: Pipeline de CI/CD

**Input**: Design documents from `/specs/002-ci-cd-pipeline/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: la spec no pide tests nuevos. La validación del pipeline es manual, siguiendo
[quickstart.md](quickstart.md). La única excepción es `cors.spec.ts`, que se adapta (y se
escribe primero) porque cambia el comportamiento de `cors.ts`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Workflows: `.github/workflows/` en la raíz del repositorio
- Paquetes: `backend/`, `frontend/` (cada uno con su `package.json` y `vercel.json`)
- Tareas **(manual)**: requieren acceso a GitHub, Vercel o Neon con credenciales de la
  persona que integra; un agente solo puede preparar los comandos y comprobar el resultado.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dejar los paquetes listos para que CI los valide sin autocorrecciones

- [ ] T001 Añadir el script `"lint:ci": "eslint \"{src,apps,libs,test}/**/*.ts\""` (mismo glob que `lint`, sin `--fix`) en `backend/package.json`, sin tocar el script `lint` existente (research R4)
- [ ] T002 Ejecutar la línea base local y confirmar que todo está en verde antes de escribir workflows: en `backend/` `npm run lint:ci`, `npm test`, `npm run build`, `npm run test:e2e` (con `docker compose up -d`); en `frontend/` `npm run lint`, `npm test`, `npm run build`. Si algo falla, arreglarlo antes de seguir

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: garantizar que solo el pipeline podrá desplegar (constitución II) antes de subir ningún workflow

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Añadir `"git": { "deploymentEnabled": false }` en `backend/vercel.json`, conservando `$schema`, `framework` y `buildCommand` (el `buildCommand` se cambia en T010) (research R11)
- [ ] T004 [P] Añadir `"git": { "deploymentEnabled": false }` en `frontend/vercel.json`, conservando `$schema`, `framework` y `rewrites` (research R11)

**Checkpoint**: ningún push puede disparar un despliegue automático de Vercel

---

## Phase 3: User Story 1 - Validación automática por paquete en cada push (Priority: P1) 🎯 MVP

**Goal**: cada push a cualquier rama que toque un paquete ejecuta su flujo `validate` (lint, unit, e2e en el backend, build y prueba de arranque) con resultado visible en el commit

**Independent Test**: push de una rama correcta → `backend / validate` y `frontend / validate` en verde; push de una rama con un test, el lint o el arranque rotos en un paquete → solo ese flujo en rojo, en el paso concreto ([quickstart.md](quickstart.md) §US1)

### Implementation for User Story 1

- [ ] T005 [US1] Crear `.github/workflows/backend.yml` con `name: backend` y solo el job `validate`, según [contracts/ci-workflows.md](contracts/ci-workflows.md) §backend.yml y [contracts/smoke-checks.md](contracts/smoke-checks.md) §B1:
  - `on.push.branches: ['**']`, `on.push.paths: ['backend/**', '.github/workflows/backend.yml']`
  - `concurrency: { group: backend-${{ github.ref }}, cancel-in-progress: ${{ github.ref != 'refs/heads/main' }} }`
  - `permissions: { contents: read }`
  - job `validate`: `runs-on: ubuntu-latest`, `timeout-minutes: 10`, `defaults.run.working-directory: backend`; service `postgres:17` con `POSTGRES_USER/POSTGRES_PASSWORD=horario`, `POSTGRES_DB=horario_ci`, `ports: ['5432:5432']` y `options: --health-cmd "pg_isready -U horario" --health-interval 5s --health-timeout 5s --health-retries 10`
  - `env` del job: `DATABASE_URL` y `DATABASE_URL_TEST` = `postgresql://horario:horario@localhost:5432/horario_ci?schema=public`, `JWT_SECRET: ci-secret`, `CORS_ORIGIN: http://localhost:5173`, `PORT: '3000'`
  - pasos con nombre en español, en este orden: checkout (`actions/checkout`, major estable actual); `actions/setup-node` con `node-version: 24`, `cache: npm`, `cache-dependency-path: backend/package-lock.json`; "Instalar dependencias" (`npm ci`); "Lint" (`npm run lint:ci`); "Tests unitarios" (`npm test`); "Build" (`npm run build`); "Prueba de arranque" (`npx prisma migrate deploy`, `node dist/main > backend.log 2>&1 &`, espera con `curl --silent --fail --retry 30 --retry-delay 2 --retry-connrefused --retry-all-errors --max-time 5 http://localhost:3000/api/health` y comparación exacta del cuerpo con `{"status":"ok"}`, con `::error::` explicativo si no coincide); "Tests e2e" (`npm run test:e2e`); "Log del backend" (`cat backend.log`, `if: failure()`)
  - el arranque va **antes** que los e2e para aplicar las migraciones sobre la base vacía (research R5)
- [ ] T006 [P] [US1] Crear `.github/workflows/frontend.yml` con `name: frontend` y solo el job `validate`, según [contracts/ci-workflows.md](contracts/ci-workflows.md) §frontend.yml y [contracts/smoke-checks.md](contracts/smoke-checks.md) §F1:
  - `on.push.branches: ['**']`, `on.push.paths: ['frontend/**', '.github/workflows/frontend.yml']`
  - `concurrency: { group: frontend-${{ github.ref }}, cancel-in-progress: ${{ github.ref != 'refs/heads/main' }} }`, `permissions: { contents: read }`
  - job `validate`: `ubuntu-latest`, `timeout-minutes: 10`, `working-directory: frontend`; Node 24 con caché npm (`frontend/package-lock.json`); pasos "Instalar dependencias" (`npm ci`), "Lint" (`npm run lint`), "Tests unitarios" (`npm test`), "Build" (`npm run build`), "Prueba de arranque" (`npm run preview -- --port 4173 --strictPort > frontend.log 2>&1 &`, `curl` con los mismos reintentos a `http://localhost:4173/` y `grep -q '<div id="root">'` sobre el cuerpo), "Log del frontend" (`cat frontend.log`, `if: failure()`)
- [ ] T007 [US1] Hacer push de la rama `002-ci-cd-vercel` con T001–T006 y comprobar con `gh run list` / `gh run view` que `backend / validate` y `frontend / validate` terminan en verde en menos de 5 min cada uno (SC-003a); corregir los workflows hasta que lo estén
- [ ] T008 [US1] Ejecutar los escenarios de fallo de [quickstart.md](quickstart.md) §US1 (2–7) en una rama desechable `ci-check-us1` creada desde `002-ci-cd-vercel`: test unitario roto, error de lint, migración con SQL inválido, `index.html` sin `<div id="root">`, dos pushes seguidos (el primero queda cancelado) y push que solo toca `README.md` (no corre ningún workflow de paquete). Anotar el paso que falla en cada caso y borrar la rama (local y remota) al terminar

**Checkpoint**: la validación por paquete funciona en cualquier rama; todavía no despliega nada

---

## Phase 4: User Story 2 - Despliegue automático a producción desde main (Priority: P2)

**Goal**: en `main`, cada paquete con `validate` en verde se despliega a su proyecto de Vercel; el backend aplica antes las migraciones a Neon; un reintento si falla el despliegue

**Independent Test**: push a `main` de un cambio visible → ambos `deploy` en verde, producción muestra el cambio y `GET https://horario-api-six.vercel.app/api/health` = `{"status":"ok"}`; push con un test roto en un paquete → ese paquete no cambia en producción ([quickstart.md](quickstart.md) §US2)

### Implementation for User Story 2

- [ ] T009 [US2] **(manual)** Crear el GitHub Environment `production` con *Deployment branches and tags* limitado a `main` y sin revisores obligatorios, y crear en él (no a nivel de repositorio) los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `VERCEL_PROJECT_ID_WEB` y `PROD_DATABASE_URL` (URL directa de Neon, host sin `-pooler`) con `gh secret set <NOMBRE> --env production` (el valor por stdin, nunca como argumento ni en archivos del repo), con la procedencia de [data-model.md](data-model.md) §Secreto de despliegue y los pasos de [quickstart.md](quickstart.md) §1.1; comprobar que `gh secret list --env production` muestra los cinco y `gh secret list` ninguno (FR-019a)
- [ ] T010 [US2] Cambiar `buildCommand` a `"npm run build"` en `backend/vercel.json` (sin `npx prisma migrate deploy`; las migraciones pasan a aplicarlas solo el pipeline) (research R11)
- [ ] T011 [US2] Añadir el job `deploy` a `.github/workflows/backend.yml`, según [contracts/ci-workflows.md](contracts/ci-workflows.md) §Job deploy del backend:
  - `needs: validate`, `if: github.ref == 'refs/heads/main'`, `environment: production` (el único sitio con secretos, FR-019a), `runs-on: ubuntu-latest`, `timeout-minutes: 10`, `working-directory: backend`
  - `env`: `VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}`, `VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_API }}`, `PROD_API_URL: https://horario-api-six.vercel.app`; `VERCEL_TOKEN` y `PROD_DATABASE_URL` solo en los pasos que los usan
  - pasos: checkout; `setup-node` con `node-version: 24` y caché npm; "Comprobar secretos" (para cada uno de `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `PROD_DATABASE_URL`, si está vacío `echo "::error::Falta el secreto <NOMBRE>"` y `exit 1`, comprobando todos antes de salir); "Instalar dependencias" (`npm ci`); "Instalar CLI de Vercel" (`npm install --global vercel@65.2.0`); "Descargar configuración" (`vercel pull --yes --environment=production --token="$VERCEL_TOKEN"`); "Build de Vercel" (`vercel build --prod --token="$VERCEL_TOKEN"`); "Migraciones de producción" (`npx prisma migrate deploy` con `DATABASE_URL_UNPOOLED` y `DATABASE_URL` = `${{ secrets.PROD_DATABASE_URL }}`, sin reintento); "Desplegar en Vercel" (bucle de 2 intentos de `vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"` con `sleep 15` entre ellos, `::warning::` en el primer fallo, `exit 1` si fallan los dos, y la URL devuelta escrita en `$GITHUB_STEP_SUMMARY`); "Verificar producción" (health de `$PROD_API_URL/api/health` con los reintentos de §B1 y cuerpo exacto `{"status":"ok"}`; si falla, `::error::` y `exit 1`, sin redesplegar ni rollback, FR-013b)
  - ningún paso sube artefactos ni imprime `.vercel/.env.production.local`
- [ ] T012 [P] [US2] Añadir el job `deploy` a `.github/workflows/frontend.yml`, como T011 (incluido `environment: production`) pero sin "Instalar dependencias" ni "Migraciones de producción": `VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID_WEB }}`, `PROD_WEB_URL: https://horario-web-eosin.vercel.app`, comprobar `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID_WEB`, y "Verificar producción" con §F1 sobre `$PROD_WEB_URL/` (`VITE_API_URL` llega con `vercel pull`)
- [ ] T013 [US2] Actualizar `README.md`:
  - sección "Demo en producción (Vercel)": los proyectos tienen Root Directory `.` y se despliegan desde `backend/` y `frontend/`; despliegan solo los workflows de GitHub Actions desde `main` (auto-deploy por Git desactivado); las migraciones las aplica `backend / deploy` antes de desplegar (ya no el build de Vercel); relanzar a mano una ejecución antigua de `main` desplegaría ese commit (research R10)
  - nueva subsección "CI/CD" con los tres workflows (enlace a [contracts/ci-workflows.md](specs/002-ci-cd-pipeline/contracts/ci-workflows.md)), el Environment `production` restringido a `main`, y una tabla de los cinco secretos con su procedencia, **sin valores** (FR-020)  - en "Ejecutar el MVP en local", `npm run lint:ci` como comprobación previa a push a `main`
- [ ] T014 [US2] Integrar `002-ci-cd-vercel` en `main` (merge local y push) y ejecutar [quickstart.md](quickstart.md) §US2 pasos 1–3, 6 y 7: ambos `deploy` en verde, health de producción `{"status":"ok"}`, el cambio visible en <https://horario-web-eosin.vercel.app>, "Migraciones de producción" con salida de Prisma, un único despliegue nuevo por proyecto en Vercel creado por la CLI, y menos de 15 min desde que empieza el flujo sin contar la cola (SC-003)
- [ ] T015 [US2] Ejecutar [quickstart.md](quickstart.md) §US2 pasos 5b y 5c: (5b) push a una rama desechable que toque ambos paquetes → ambos `deploy` *omitidos* y sin migraciones; en esa rama, quitar el `if:` del `deploy` de `frontend.yml` → GitHub rechaza el job por la regla de ramas del Environment `production` (FR-015, FR-019a, SC-004); borrar la rama. (5c) dos pushes seguidos a `main` que toquen el frontend → la segunda ejecución espera a la primera y producción queda con el segundo commit (FR-014). Opcional: paso 5 (secreto ausente) renombrando temporalmente `VERCEL_PROJECT_ID_WEB` en el Environment y restaurándolo
- [ ] T016 [US2] Ejecutar [quickstart.md](quickstart.md) §US2 paso 4 (push a `main` con un test del frontend roto → `frontend / deploy` omitido y producción del frontend sin cambios) y revertirlo con otro push a `main` que vuelva a dejar todo en verde. Es un push en rojo **deliberado** a `main`, que exige la prueba independiente de la US2; se avisa al equipo antes y se revierte inmediatamente

**Checkpoint**: `main` despliega por sí solo los paquetes en verde

---

## Phase 5: User Story 3 - Validación de integración backend + frontend (Priority: P3)

**Goal**: en cada push a `main`, un flujo informativo levanta backend y frontend compilados juntos y comprueba health, frontend servido, `VITE_API_URL` aplicado y CORS

**Independent Test**: push a `main` → `integration / integration` en verde con I1–I5; con un `CORS_ORIGIN` incorrecto en el workflow, falla "CORS acepta el origen del frontend" mientras los `deploy` siguen ([quickstart.md](quickstart.md) §US3)

### Implementation for User Story 3

- [ ] T017 [US3] Crear `.github/workflows/integration.yml` con `name: integration` y el job `integration`, según [contracts/ci-workflows.md](contracts/ci-workflows.md) §integration.yml y [contracts/smoke-checks.md](contracts/smoke-checks.md) §Integración:
  - `on.push.branches: [main]` (sin `paths`), `concurrency: { group: integration-${{ github.ref }}, cancel-in-progress: true }`, `permissions: { contents: read }`; sin secretos y sin `needs` hacia otros workflows
  - `ubuntu-latest`, `timeout-minutes: 10`, service `postgres:17` como en T005; Node 24 con caché npm para ambos lockfiles (`cache-dependency-path` con `backend/package-lock.json` y `frontend/package-lock.json`)
  - pasos: "Backend: instalar y compilar" (`npm ci`, `npm run build` en `backend/`); "Backend: arrancar" (`npx prisma migrate deploy` y `node dist/main > backend.log 2>&1 &` con `DATABASE_URL` del servicio, `JWT_SECRET: ci-secret`, `PORT: '3001'`, `CORS_ORIGIN: http://localhost:4173`); "Frontend: instalar y compilar" (`npm ci`, `npm run build` en `frontend/` con `VITE_API_URL: http://localhost:3001`); "Frontend: servir" (`npm run preview -- --port 4173 --strictPort > frontend.log 2>&1 &`); "Health del backend" (I1); "Frontend servido" (I2); "Frontend apunta al backend" (I3: `grep -rq "http://localhost:3001" frontend/dist/assets`); "CORS acepta el origen del frontend" (I4: `curl -si -X OPTIONS` a `/api/auth/login` con las cabeceras de §I4, exigir estado 204 y `access-control-allow-origin: http://localhost:4173` sin distinguir mayúsculas en el nombre); "CORS rechaza otros orígenes" (I5: misma petición con `Origin: http://evil.example`, fallar si aparece `access-control-allow-origin`); "Logs" (`cat backend/backend.log frontend/frontend.log`, `if: failure()`)
- [ ] T018 [US3] Integrar T017 en `main` y comprobar que `integration / integration` termina en verde con los pasos I1–I5 y en paralelo a los workflows de paquete ([quickstart.md](quickstart.md) §US3 paso 1)
- [ ] T019 [US3] Ejecutar [quickstart.md](quickstart.md) §US3 paso 2 (cambiar temporalmente `CORS_ORIGIN` del paso "Backend: arrancar" en `.github/workflows/integration.yml`, push a `main`): falla "CORS acepta el origen del frontend" y no afecta a `backend / deploy` ni a `frontend / deploy`; revertir con otro push a `main`. Es un push en rojo **deliberado** a `main` (prueba independiente de la US3), que se avisa y se revierte inmediatamente

**Checkpoint**: las tres historias funcionan de forma independiente

---

## Phase 6: Polish & Cross-Cutting Concerns (restos de los previews)

**Purpose**: retirar lo que solo existía para los previews (FR-016, research R13) y auditar los secretos

- [ ] T020 **(manual)** Comprobar en Vercel → `horario-api` → Environment Variables que `CORS_ORIGIN` (Production) contiene exactamente `https://horario-web-eosin.vercel.app` y quitar cualquier entrada con `*` ([quickstart.md](quickstart.md) §1.2). **Debe hacerse antes de que T022 llegue a `main`**
- [ ] T021 [P] Actualizar primero `backend/src/common/cors.spec.ts`: quitar el caso "allows preview subdomains through the * wildcard", quitar la entrada con `*` de la lista de ejemplo, y añadir un caso que exija que una entrada con `*` (p. ej. `https://horario-web-*.vercel.app`) ya **no** acepte `https://horario-web-git-feat-abc-team.vercel.app`; ejecutar `npm test` en `backend/` y comprobar que el nuevo caso falla
- [ ] T022 Simplificar `backend/src/common/cors.ts` a orígenes exactos (FR-021): `parseAllowedOrigins` devuelve `string[]` (trim y sin vacíos) e `isOriginAllowed(origin, allowed)` compara por igualdad; eliminar `escapeRegExp` y actualizar el comentario de cabecera (sin mención a previews). `backend/src/app.setup.ts` no debería necesitar cambios. Cambiar en `backend/.env.example` el comentario de `CORS_ORIGIN` a "lista de orígenes exactos separada por comas". Ejecutar en `backend/` `npm run lint:ci`, `npm test` y `npm run test:e2e` y comprobar que pasan (depende de T021)
- [ ] T023 **(manual)** Limpieza de previews en Vercel y Neon según [quickstart.md](quickstart.md) §1.3: borrar las variables del entorno Preview de `horario-api` y `horario-web` (`vercel env ls preview` en `backend/` y `frontend/` sin resultados) y desactivar en la integración de Neon la rama de BD por preview, borrando las ramas de preview que queden
- [ ] T024 Auditoría de secretos ([quickstart.md](quickstart.md) §Secretos y logs): `git log -p` sin coincidencias de `neon.tech`, `prj_`, `team_` ni tokens, y en los logs de la última ejecución de `backend / deploy` y `frontend / deploy` (`gh run view --log`) los secretos aparecen como `***` y no hay volcado de `.vercel/.env.production.local` (FR-019, SC-005)
- [ ] T025 Marcar como completada la línea "CI/CD" de la sección "Estado" de `README.md` (pipeline implementado, enlace a `specs/002-ci-cd-pipeline/`), integrar en `main` y comprobar que el push final deja en verde `backend`, `frontend` e `integration` y que la app de producción funciona de punta a punta (login → semana) con el CORS de orígenes exactos

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias (no se sube ningún workflow sin el auto-deploy desactivado)
- **US1 (Phase 3)**: depende de Foundational
- **US2 (Phase 4)**: depende de US1 (los jobs `deploy` van en los mismos archivos y usan `needs: validate`) y de T009 (secretos)
- **US3 (Phase 5)**: depende solo de Foundational; su comprobación exige llegar a `main`, así que en la práctica se integra después de US2
- **Polish (Phase 6)**: T020 antes de que T022 llegue a `main`; T021 → T022; T023 y T024 cuando US2 esté en `main`; T025 al final

### User Story Dependencies

- **US1 (P1)**: independiente; es el MVP
- **US2 (P2)**: requiere US1 (mismos workflows, `needs: validate`)
- **US3 (P3)**: independiente de US1/US2 en código (archivo propio, sin `needs`); solo se ejecuta en `main`

### Within Each User Story

- Workflow escrito → push → comprobación de los escenarios del quickstart
- T010 (quitar la migración del build de Vercel) debe llegar a `main` en el mismo push que T011, para que las migraciones nunca se queden sin quién las aplique

### Parallel Opportunities

- T003 y T004 (archivos distintos)
- T005 y T006 (workflows distintos)
- T011 y T012 (workflows distintos; T012 no depende de T010)
- T017 puede escribirse en paralelo a toda la fase US2
- T021 en paralelo a T020 y T023

---

## Parallel Example: User Story 1

```bash
# Los dos workflows de validación son archivos independientes:
Task: "Create .github/workflows/backend.yml with the validate job (T005)"
Task: "Create .github/workflows/frontend.yml with the validate job (T006)"
```

## Parallel Example: User Story 2

```bash
Task: "Add the deploy job to .github/workflows/backend.yml (T011)"
Task: "Add the deploy job to .github/workflows/frontend.yml (T012)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001–T002) y Phase 2 (T003–T004)
2. Phase 3 (T005–T008)
3. **STOP and VALIDATE**: cada push valida backend y frontend por separado; los despliegues
   siguen siendo manuales

### Incremental Delivery

1. Setup + Foundational → sin auto-deploy de Vercel
2. US1 → validación en todas las ramas (MVP)
3. US2 → `main` despliega y migra por sí solo
4. US3 → señal de integración en `main`
5. Polish → fuera el comodín de CORS y los restos de previews; auditoría de secretos

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Al completar cada tarea, marcarla `[X]` en este archivo en el mismo cambio (constitución, AGENTS.md)
- Las tareas **(manual)** (T009, T020, T023) necesitan a la persona con acceso a GitHub/Vercel/Neon
- Sin verificación por ejecución (riesgo en producción), se revisan leyendo el workflow: fallo de migraciones de producción (US2 AS4), reintento del despliegue (FR-013a) y fallo de la verificación posterior (FR-013b) ([quickstart.md](quickstart.md) §US2 paso 8)
- Tras `/speckit-analyze` se resolvieron en la spec los conflictos de la checklist [checklists/deploy-security.md](checklists/deploy-security.md) CHK010 (FR-019a), CHK017 (FR-001, constitución v1.2.0), CHK019 (SC-001), CHK024 (SC-003) y CHK029 (FR-013b); sus casillas las marca quien revisa
- Commit messages en inglés, sin co-autoría de Claude
