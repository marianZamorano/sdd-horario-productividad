# Contract: auth

Cubre US1, FR-001 y FR-002. Ver las convenciones en [README.md](README.md).

## Tipos

```ts
type UserDto = { id: string; email: string; timezone: string; createdAt: string };
type AuthResponse = { accessToken: string; user: UserDto };
```

## POST /api/auth/register — Público

Request:

```json
{ "email": "ana@example.com", "password": "secreto123", "timezone": "America/La_Paz" }
```

| Campo | Reglas |
|-------|--------|
| `email` | requerido, email válido, máx. 254; se normaliza a minúsculas |
| `password` | requerido, string de 8 a 72 caracteres (72 es el límite de bcrypt) |
| `timezone` | opcional, zona IANA válida; por defecto `UTC` |

Responses:

- `201 AuthResponse`
- `400` validación
- `409 { code: "EMAIL_TAKEN", message: "Ya existe una cuenta con ese email" }`

## POST /api/auth/login — Público

Request: `{ "email": "ana@example.com", "password": "secreto123" }`

Responses:

- `200 AuthResponse`
- `401 { message: "Credenciales inválidas" }`: es el mismo mensaje si el email no existe
  o la contraseña es incorrecta.

## GET /api/auth/me

Responses: `200 UserDto` · `401`.

## Cerrar sesión

No hay endpoint: el frontend borra el token de `localStorage`. El JWT caduca a los 7 días.
