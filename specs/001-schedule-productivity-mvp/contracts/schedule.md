# Contract: schedule

Cubre US4, US5 y FR-010 a FR-019. Ver las convenciones en [README.md](README.md).

## Tipos

```ts
type BlockStatus = 'PLANNED' | 'COMPLETED' | 'SKIPPED';

type ScheduleBlockDto = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskCategory: string | null;
  taskPriority: 'HIGH' | 'MEDIUM' | 'LOW';
  startAt: string;          // ISO UTC
  endAt: string;            // ISO UTC
  durationMinutes: number;
  status: BlockStatus;
  overdue: boolean;         // la tarea estaba vencida (FR-015)
};

type UnassignedDto = {
  taskId: string;
  taskTitle: string;
  minutes: number;
  reason: 'NO_SPACE' | 'NO_SPACE_BEFORE_DEADLINE';
};

type WeekScheduleDto = {
  weekStart: string;        // YYYY-MM-DD (lunes local)
  timezone: string;         // zona del usuario usada para pintar la semana
  blocks: ScheduleBlockDto[];
};

type GenerateResultDto = WeekScheduleDto & {
  unassigned: UnassignedDto[];
  createdBlocks: number;
  hasAvailability: boolean; // false → la UI invita a definir franjas
  hasPendingTasks: boolean; // false → "no hay nada que planificar"
};
```

## GET /api/schedule?weekStart=YYYY-MM-DD

- `weekStart` es requerido y debe ser un lunes; si no lo es → `400`.
- `200 WeekScheduleDto`: todos los bloques cuyo `startAt` cae en la semana, ordenados
  por `startAt`.

## POST /api/schedule/generate

Request: `{ "weekStart": "2026-10-26" }`

Comportamiento (FR-010 a FR-017):

1. En una transacción, borra los bloques `PLANNED` del usuario en esa semana.
2. Llama a `generateSchedule()` (función pura) con: `now`, la zona del usuario, las
   franjas, las tareas `PENDING` con `pendingMinutes > 0` y los bloques
   `COMPLETED`/`SKIPPED` de la semana como `keptBlocks`.
3. Inserta los bloques devueltos y responde con la semana completa más `unassigned`.

Mismas entradas → mismo resultado (FR-017). Sin franjas o sin tareas pendientes no es un
error: responde `200` con `createdBlocks: 0` y el flag correspondiente en `false`.

Responses: `200 GenerateResultDto` · `400` (si `weekStart` no es un lunes válido).

## PATCH /api/schedule/blocks/:id

Request: `{ "status": "COMPLETED" }`, con `status` ∈ `PLANNED | COMPLETED | SKIPPED`.

Efectos (FR-008, FR-019): recalcula `completedMinutes` de la tarea. Si alcanza la
duración → la tarea pasa a `DONE`. Si un bloque deja de estar `COMPLETED` y la tarea
estaba `DONE` con Σ < duración → la tarea vuelve a `PENDING`.

Responses: `200 { block: ScheduleBlockDto, task: TaskDto }` · `400` · `404`.
