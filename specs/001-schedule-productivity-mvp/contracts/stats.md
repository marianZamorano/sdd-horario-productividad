# Contract: stats

Cubre US6 y FR-020 a FR-022. Ver las convenciones en [README.md](README.md). El cálculo
vive en la función pura `computeWeekStats()` ([data-model.md](../data-model.md#tipos-del-dominio-puro-no-persistidos)).

## GET /api/stats/week?weekStart=YYYY-MM-DD

- `weekStart` es requerido y debe ser un lunes; si no lo es → `400`.

```ts
type WeekStatsDto = {
  weekStart: string;
  totalBlocks: number;
  completedBlocks: number;
  skippedBlocks: number;
  completionRate: number;   // 0–100, entero; completedBlocks / totalBlocks; 0 si no hay bloques
  plannedMinutes: number;   // Σ duración de todos los bloques de la semana (cualquier estado)
  completedMinutes: number; // Σ duración completa de los bloques COMPLETED
  tasksCompleted: number;   // tareas con completedAt dentro de la semana
  streakDays: number;       // racha actual, independiente de weekStart (FR-022)
};
```

Ejemplo, semana con 10 bloques (6 completados y 2 omitidos):

```json
{ "weekStart": "2026-10-26", "totalBlocks": 10, "completedBlocks": 6, "skippedBlocks": 2,
  "completionRate": 60, "plannedMinutes": 480, "completedMinutes": 300,
  "tasksCompleted": 2, "streakDays": 3 }
```

Responses: `200 WeekStatsDto` · `400`.
