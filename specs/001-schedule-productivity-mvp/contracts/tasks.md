# Contract: tasks

Cubre US3, FR-006 a FR-009. Ver las convenciones en [README.md](README.md).

## Tipos

```ts
type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type TaskStatus = 'PENDING' | 'DONE';

type TaskDto = {
  id: string;
  title: string;
  durationMinutes: number;
  priority: Priority;
  deadline: string | null;    // YYYY-MM-DD
  category: string | null;
  status: TaskStatus;
  completedAt: string | null; // ISO UTC
  createdAt: string;
  // derivados
  completedMinutes: number;
  remainingMinutes: number;
  overdue: boolean;
};
```

## GET /api/tasks

Query opcional: `status=PENDING|DONE`.

`200 TaskDto[]`, ordenado como el generador: vencidas, prioridad, fecha límite (nulls
last) y `createdAt`.

## POST /api/tasks

Request:

```json
{ "title": "Estudiar cálculo", "durationMinutes": 120, "priority": "HIGH", "deadline": "2026-10-30", "category": "Universidad" }
```

| Campo | Reglas |
|-------|--------|
| `title` | requerido, 1–120 caracteres tras `trim` |
| `durationMinutes` | requerido, entero 15–1440, múltiplo de 5 |
| `priority` | requerido, `HIGH`, `MEDIUM` o `LOW` |
| `deadline` | opcional, fecha `YYYY-MM-DD` o `null` |
| `category` | opcional, máx. 40 caracteres; vacío → `null` |

Responses: `201 TaskDto` (`status: PENDING`) · `400`.

## PATCH /api/tasks/:id

Request: cualquier subconjunto de los campos de POST más `status`.

- `status: "DONE"` → marca la tarea como terminada (fija `completedAt`).
- `status: "PENDING"` → la reabre (`completedAt = null`).
- Cambiar `durationMinutes` reevalúa FR-008: si los minutos completados son ≥ la nueva
  duración, la tarea pasa a `DONE`.

Responses: `200 TaskDto` · `400` · `404`.

## DELETE /api/tasks/:id

Borra la tarea y **todos** sus bloques (FR-009). La confirmación la pide el frontend
antes de llamar.

Responses: `204` · `404`.
