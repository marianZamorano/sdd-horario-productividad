# Data Model: Pipeline de CI/CD

**Sin cambios en el esquema de base de datos.** Esta feature no toca
`backend/prisma/schema.prisma` ni añade migraciones. Las "entidades" de la spec son objetos
de GitHub Actions y de Vercel; aquí se fija su forma y sus reglas.

## Flujo (ejecución de un workflow)

| Campo | Valores | Origen |
|-------|---------|--------|
| workflow | `backend`, `frontend`, `integration` | archivo en `.github/workflows/` |
| commit | SHA del push | `github.sha` |
| rama | `refs/heads/<rama>` | `github.ref` |
| jobs | `validate` + `deploy` (paquetes) · `integration` | [contracts/ci-workflows.md](contracts/ci-workflows.md) |
| resultado | aprobado · fallido · cancelado · omitido | GitHub Checks en el commit |

**Estados de un job**

```text
en cola ──► en curso ──► aprobado
                    ├──► fallido      (paso en rojo o timeout de 10 min)
                    └──► cancelado    (sustituido por un push más nuevo; ver reglas)
omitido               (deploy en una rama ≠ main, o validate no aprobado)
```

**Reglas**

- `deploy` solo pasa a "en curso" si `validate` del mismo flujo está "aprobado" y la rama es
  `main` (FR-010, FR-012, FR-015).
- En `main` nunca se cancela un flujo en curso; uno pendiente puede quedar "cancelado" si
  llega un push más nuevo del mismo paquete (FR-014).
- En otras ramas, un flujo en curso se cancela cuando llega un push más nuevo a la misma rama.
- `integration` no condiciona a ningún otro job (FR-018).

## Despliegue

| Campo | Valores |
|-------|---------|
| proyecto | `horario-api` (desde `backend/`) · `horario-web` (desde `frontend/`) |
| entorno | `production` (único; FR-016) |
| commit | SHA de `main` que lo generó |
| URL del despliegue | salida de `vercel deploy`, publicada en el resumen del job |
| URL de producción | `https://horario-api-six.vercel.app` · `https://horario-web-eosin.vercel.app` |
| intentos | 1 o 2 (un reintento automático, FR-013a) |

Regla para `horario-api`: el orden es build → migraciones → despliegue → verificación. Si
las migraciones fallan no hay despliegue; si el despliegue falla tras migrar, las migraciones
se mantienen. Si la verificación en producción falla, el job queda en rojo sin reintento ni
rollback (FR-013b).

## Secreto de despliegue (GitHub Environment `production`)

Viven como *environment secrets* del Environment `production` (Settings → Environments →
`production`), cuya regla *Deployment branches and tags* solo admite `main` (FR-019a). No
hay secretos de repositorio.

| Nombre | Contenido | Cómo obtenerlo |
|--------|-----------|----------------|
| `VERCEL_TOKEN` | token de acceso de Vercel | Vercel → Account Settings → Tokens (alcance: el equipo de los proyectos) |
| `VERCEL_ORG_ID` | ID del equipo (`team_…`) | `orgId` en `backend/.vercel/project.json` o Team Settings |
| `VERCEL_PROJECT_ID_API` | ID de `horario-api` (`prj_…`) | `projectId` en `backend/.vercel/project.json` |
| `VERCEL_PROJECT_ID_WEB` | ID de `horario-web` (`prj_…`) | `projectId` en `frontend/.vercel/project.json` |
| `PROD_DATABASE_URL` | URL **directa** de Neon (host sin `-pooler`) | Vercel → `horario-api` → Environment Variables → `DATABASE_URL_UNPOOLED` (Production), o Neon → Connection Details con pooling desactivado |

Reglas: nunca en el repositorio ni en logs (FR-019); solo accesibles desde jobs de `main`
que declaran `environment: production` (FR-019a); el README lista nombres y procedencia, sin
valores (FR-020). Las carpetas `.vercel/` están ignoradas por Git.

## Configuración versionada que cambia

| Archivo | Cambio |
|---------|--------|
| `backend/vercel.json` | `"git": { "deploymentEnabled": false }`; `buildCommand` → `npm run build` (sin `prisma migrate deploy`) |
| `frontend/vercel.json` | `"git": { "deploymentEnabled": false }` |
| `backend/package.json` | script `lint:ci` (ESLint sin `--fix`) |
| `backend/src/common/cors.ts` | `CORS_ORIGIN` como lista de orígenes exactos (sin comodín) |
| `backend/.env.example` | comentario de `CORS_ORIGIN` sin mención al comodín |

## Variables de entorno de runtime (sin cambios)

Siguen en Vercel, entorno Production: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (las inyecta
Neon), `JWT_SECRET`, `CORS_ORIGIN` (backend) y `VITE_API_URL` (frontend). Se eliminan las del
entorno **Preview** (limpieza manual, [quickstart.md](quickstart.md)).
