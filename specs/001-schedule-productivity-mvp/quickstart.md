# Quickstart: validar el Mini-MVP Horario Productivo

Guía para levantar el proyecto y comprobar de punta a punta que la feature cumple la
[spec](spec.md). Los detalles de la API están en [contracts/](contracts/README.md) y los
del modelo en [data-model.md](data-model.md).

## Prerrequisitos

- Node.js 24 LTS (mínimo 20.19 para Prisma 7) y npm
- Docker Desktop (Postgres local); como alternativa, una rama de desarrollo de Neon
- Para el deploy: cuenta de Vercel y CLI ≥ 48.4 (`npm i -g vercel`, `vercel login`)

## 1. Base de datos local

```bash
docker compose up -d        # postgres:17 con las bases horario y horario_test
```

## 2. Backend

```bash
cd backend
cp .env.example .env        # DATABASE_URL, DATABASE_URL_UNPOOLED, JWT_SECRET, CORS_ORIGIN=http://localhost:5173
npm install
npx prisma migrate dev      # aplica el esquema
npm run start:dev           # http://localhost:3000/api
curl http://localhost:3000/api/health   # → {"status":"ok"}
```

## 3. Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:3000
npm install
npm run dev                 # http://localhost:5173
```

## 4. Tests automáticos (deben pasar todos)

```bash
cd backend && npm run lint && npm test && npm run test:e2e   # unit (scheduler, stats) + e2e supertest
cd frontend && npm run lint && npm test                      # Vitest
```

Cobertura mínima esperada en los unit tests del scheduler: los escenarios de US4 (1–7) y
los casos límite de la spec (sin franjas, sin tareas, tarea más larga que las franjas,
resto < 25 min, generar a mitad de semana, bloques conservados).

## 5. Recorrido manual (flujo completo)

| # | Acción | Resultado esperado | Requisito |
|---|--------|--------------------|-----------|
| 1 | Registrarse con `ana@example.com` / `secreto123` | Entra a la app con la sesión iniciada | FR-001 |
| 2 | Añadir franjas: lunes 18:00–22:00 y sábado 09:00–13:00 | Aparecen ordenadas; "lunes 21:00–23:00" se rechaza por solape | FR-004, FR-005 |
| 3 | Crear 5 tareas: una alta de 120 min con fecha límite, una media de 50, una baja de 30, una alta sin fecha de 90 y una con fecha límite de ayer | Lista con los minutos restantes; la de ayer aparece como vencida | FR-006, FR-007 |
| 4 | Ir a "Semana" (la siguiente, si hoy ya pasó el lunes) y pulsar **Generar** | La vencida va primero; los bloques son de 25–50 min con 5 min entre ellos, sin solapes y dentro de las franjas; lo que no cabe aparece en "Sin asignar" | FR-010 a FR-015 |
| 5 | Marcar 2 bloques como completados y 1 como omitido | Cambian de estado; los minutos restantes bajan solo con los completados | FR-019, FR-007 |
| 6 | Pulsar **Generar** otra vez | Los bloques completados y omitidos siguen igual; el resto se recalcula sin solaparse con ellos | FR-016 |
| 7 | Abrir "Productividad" | % = completados / total; horas planificadas y completadas coherentes; racha ≥ 1 si se completó un bloque hoy | FR-020 a FR-022 |
| 8 | Registrar una segunda cuenta y pedir con su token `GET /api/tasks/<id de Ana>` | `404` | FR-003 |
| 9 | Cerrar sesión y volver a entrar | Los datos de Ana siguen ahí | FR-002 |

Objetivo de tiempo (SC-001): los pasos 1 a 4 en menos de 3 minutos.

## 6. Deploy en Vercel

1. Proyecto **backend**: Root Directory `backend`, framework NestJS (autodetectado), build
   command `npx prisma migrate deploy && npm run build`.
2. Instalar **Neon** desde Vercel Marketplace y conectarlo al proyecto backend
   (`DATABASE_URL` y `DATABASE_URL_UNPOOLED` se inyectan solas).
3. Variables del backend: `JWT_SECRET` (aleatorio, ≥ 32 caracteres) y `CORS_ORIGIN`
   (dominio de producción del frontend más el patrón de previews).
4. Proyecto **frontend**: Root Directory `frontend`, framework Vite, variable
   `VITE_API_URL` = URL del backend.
5. Desplegar los dos a producción, comprobar `GET <backend>/api/health` y repetir el
   recorrido manual del paso 5 contra la URL pública (SC-007).
