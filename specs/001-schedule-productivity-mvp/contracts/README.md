# API Contracts — Horario Productivo

Contrato REST entre `frontend/` y `backend/` (constitución IV). El frontend **solo**
consume lo documentado aquí; cualquier cambio se hace primero en estos archivos.

| Módulo | Archivo | Endpoints |
|--------|---------|-----------|
| auth | [auth.md](auth.md) | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| availability | [availability.md](availability.md) | `GET/POST /api/availability`, `PATCH/DELETE /api/availability/:id` |
| tasks | [tasks.md](tasks.md) | `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/:id` |
| schedule | [schedule.md](schedule.md) | `GET /api/schedule`, `POST /api/schedule/generate`, `PATCH /api/schedule/blocks/:id` |
| stats | [stats.md](stats.md) | `GET /api/stats/week` |
| health | (este archivo) | `GET /api/health` |

## Convenciones comunes

- **Base URL**: `${VITE_API_URL}` (p. ej. `https://horario-api.vercel.app`); todas las
  rutas cuelgan de `/api`.
- **Formato**: JSON UTF-8. Los campos van en `camelCase`.
- **Fechas**: instantes en ISO 8601 UTC (`2026-10-26T22:00:00.000Z`); fechas sin hora en
  `YYYY-MM-DD`; `weekStart` siempre es un lunes `YYYY-MM-DD` en la zona del usuario.
- **Autenticación**: `Authorization: Bearer <accessToken>` en todo endpoint salvo los
  marcados como **Público**.
- **Validación**: los DTO se validan con class-validator; cualquier campo desconocido
  → `400`.
- **Recursos ajenos**: un `id` que existe pero pertenece a otro usuario responde `404`,
  igual que uno inexistente (FR-003).

### Formato de error

```json
{ "statusCode": 400, "message": ["durationMinutes must be a multiple of 5"], "error": "Bad Request" }
```

`message` puede ser un string o un array de strings (errores de validación). Los errores
de dominio añaden `code`:

```json
{ "statusCode": 409, "message": "La franja se solapa con otra existente", "error": "Conflict", "code": "SLOT_OVERLAP" }
```

| Código HTTP | Cuándo |
|-------------|--------|
| 400 | Validación de DTO o de query |
| 401 | Falta el token, es inválido o expiró (el frontend redirige a `/login`) |
| 404 | El recurso no existe o es de otro usuario |
| 409 | Conflicto de dominio (`EMAIL_TAKEN`, `SLOT_OVERLAP`) |

## GET /api/health — Público

`200 { "status": "ok" }`. Lo usa el deploy para comprobar que la Function responde.
