# Quickstart: validar el pipeline de CI/CD

Guía para preparar el entorno y comprobar de punta a punta que el pipeline cumple la
[spec](spec.md). Qué hace cada workflow: [contracts/ci-workflows.md](contracts/ci-workflows.md);
qué comprueba cada prueba HTTP: [contracts/smoke-checks.md](contracts/smoke-checks.md).

## 0. Requisitos

- Acceso de administración al repositorio de GitHub y a los proyectos `horario-api` y
  `horario-web` de Vercel.
- Vercel CLI y `gh` instalados en local (solo para comprobar; el pipeline instala lo suyo).

## 1. Configuración manual (una sola vez, antes del primer push a `main`)

### 1.1 Environment `production` y sus secretos

1. Repositorio → Settings → Environments → *New environment* → `production`.
2. En *Deployment branches and tags*, elegir *Selected branches and tags* y añadir solo
   `main`. Sin revisores obligatorios.
3. En *Environment secrets*, crear los seis secretos de
   [data-model.md](data-model.md#secreto-de-despliegue-github-environment-production):
   `VERCEL_TOKEN_API`, `VERCEL_TOKEN_WEB`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `VERCEL_PROJECT_ID_WEB` y
   `PROD_DATABASE_URL`. También por CLI: `gh secret set <NOMBRE> --env production` (el
   valor por stdin).

```bash
gh secret list --env production   # deben aparecer los seis nombres (nunca los valores)
gh secret list                    # no debe aparecer ninguno a nivel de repositorio
```

### 1.2 CORS de producción (antes de desplegar el cambio de `cors.ts`)

En Vercel → `horario-api` → Settings → Environment Variables → `CORS_ORIGIN`
(Production): debe contener el origen exacto `https://horario-web-eosin.vercel.app`. Quitar
cualquier entrada con `*` (p. ej. `https://horario-web-*.vercel.app`): tras esta feature el
comodín ya no se interpreta.

### 1.3 Limpieza de restos de previews

1. Vercel → `horario-api` y `horario-web` → Settings → Environment Variables: borrar las
   variables del entorno **Preview** (o quitarles ese entorno si también están en
   Production). Comprobar con `vercel env ls preview` en `backend/` y `frontend/`: no debe
   listar nada.
2. Neon (Vercel → Storage → `horario-db` → configuración de la integración): desactivar la
   creación de una **rama de base de datos por cada deploy de preview**, y borrar en Neon las
   ramas de preview que queden.
3. Vercel → cada proyecto → Settings → Git: si el repositorio está conectado, puede quedarse
   así (`deploymentEnabled: false` impide los despliegues automáticos); si no lo está, no hay
   que hacer nada.

## 2. Escenarios de validación

Para cada escenario, el resultado se ve en GitHub → Actions o en los checks del commit
(`gh run list --limit 5`, `gh run view <id>`).

### US1 — Validación por paquete en una rama

1. **Rama correcta**: crear una rama, cambiar un archivo de `backend/` y otro de
   `frontend/`, push. → `backend / validate` y `frontend / validate` en verde; ambos
   `deploy` aparecen como *omitidos*; no corre `integration`.
2. **Test roto en un paquete**: romper un test unitario del backend, push. → falla
   `backend / validate` en el paso "Tests unitarios"; `frontend / validate` (si se ejecuta)
   no se ve afectado.
3. **Error de lint**: añadir una variable sin usar en el frontend, push. → falla
   `frontend / validate` en "Lint".
4. **Backend que no arranca**: añadir una migración con SQL inválido, push. → falla
   `backend / validate` en "Prueba de arranque" y el log del backend aparece en el paso de
   diagnóstico.
5. **Frontend que no se sirve**: vaciar `frontend/index.html` del `<div id="root">`, push. →
   falla `frontend / validate` en "Prueba de arranque".
6. **Push seguido en la misma rama**: dos pushes en menos de un minuto. → la primera
   ejecución queda *cancelada*; solo cuenta la segunda.
7. **Sin cambios en un paquete**: cambiar solo `README.md`. → no se ejecuta ningún workflow
   de paquete.

Revertir todos los cambios de prueba y borrar la rama al terminar.

### US2 — Despliegue a producción desde `main`

1. Push a `main` de un cambio visible en el frontend (p. ej. un texto de la UI) y de un
   cambio inocuo en el backend. → `backend / deploy` y `frontend / deploy` en verde; el
   resumen de cada job muestra la URL del despliegue.
2. Comprobar producción:

   ```bash
   curl https://horario-api-six.vercel.app/api/health   # {"status":"ok"}
   ```

   y abrir <https://horario-web-eosin.vercel.app>: se ve el cambio y el flujo de login →
   semana funciona (CORS sin comodín correcto).
3. **Migraciones solo desde el pipeline**: en `backend / deploy`, el paso "Migraciones de
   producción" muestra las migraciones aplicadas (o "No pending migrations"); el build de
   Vercel ya no ejecuta `prisma migrate deploy`.
4. **Paquete en rojo no despliega**: push a `main` con un test del frontend roto. →
   `frontend / deploy` *omitido*, producción del frontend sin cambios; el backend (si cambió)
   se despliega igualmente. Arreglar con otro push.
5. **Secreto ausente** (opcional, renombrando temporalmente `VERCEL_PROJECT_ID_WEB` en el
   Environment `production`): `frontend / deploy` falla en "Comprobar secretos" con
   `Falta el secreto VERCEL_PROJECT_ID_WEB`. Restaurar el secreto.
5b. **Otras ramas no despliegan ni migran** (FR-015, FR-019a, SC-004): push a una rama
   desechable que toque ambos paquetes → `validate` en verde y ambos `deploy` *omitidos*,
   sin paso "Migraciones de producción". Opcional: en esa rama, quitar el `if:` del job
   `deploy` de `frontend.yml` → GitHub rechaza el job porque la rama no puede usar el
   Environment `production`. Borrar la rama.
5c. **Serialización en `main`** (FR-014): dos pushes seguidos a `main` que toquen el
   frontend → la segunda ejecución espera a que termine la primera (no la cancela) y
   producción queda con el segundo commit.
6. **Sin auto-deploy de Vercel**: tras el push, en el dashboard de Vercel cada proyecto
   tiene un único despliegue nuevo, creado por la CLI (no por Git).
7. **Tiempo**: desde que empieza el flujo hasta el job `deploy` en verde, menos de 15 min
   sin contar la cola (SC-003); cada `validate` por debajo de 5 min (SC-003a).
8. **No verificados por ejecución** (se revisan leyendo el workflow, porque provocarlos en
   producción es arriesgado): fallo de las migraciones de producción (US2 AS4), reintento del
   despliegue (FR-013a) y fallo de la verificación posterior (FR-013b).

### US3 — Integración

1. En el push de US2.1, `integration / integration` en verde con los pasos I1–I5.
2. **Incompatibilidad**: en una rama de prueba, cambiar `CORS_ORIGIN` del paso "Backend:
   arrancar" de `integration.yml` a otro origen y fusionarla en `main`. → falla el paso
   "CORS acepta el origen del frontend" mientras `backend / deploy` y `frontend / deploy`
   siguen su curso. Revertir con otro push.

### Secretos y logs

```bash
git log -p | grep -iE "neon\.tech|vercel_[a-z0-9]{20,}|prj_|team_"   # sin resultados
```

En los logs de `deploy`, los valores de los secretos aparecen como `***`.

## 3. Comprobaciones locales antes de push a `main` (constitución)

```bash
cd backend  && npm run lint:ci && npm test && npm run test:e2e
cd frontend && npm run lint && npm test && npm run build
```
