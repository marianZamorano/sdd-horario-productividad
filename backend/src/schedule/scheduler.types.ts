import type { Priority } from '../tasks/task-rules';

// Tipos del dominio puro del generador (data-model.md §Tipos del dominio puro).

/** Bloque mínimo, máximo y descanso entre bloques consecutivos (spec FR-012, FR-013). */
export const MIN_BLOCK = 25;
export const MAX_BLOCK = 50;
export const BREAK = 5;

export interface SchedulerSlot {
  /** 1 = lunes … 7 = domingo */
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export interface SchedulerTask {
  id: string;
  /** duración − completados − planificados en otras semanas (research R5) */
  pendingMinutes: number;
  priority: Priority;
  deadline: string | null;
  createdAt: Date;
}

export interface SchedulerInput {
  now: Date;
  timezone: string;
  /** Lunes local `YYYY-MM-DD` */
  weekStart: string;
  slots: SchedulerSlot[];
  tasks: SchedulerTask[];
  /** Bloques COMPLETED/SKIPPED conservados al regenerar (FR-016) */
  keptBlocks: { startAt: Date; endAt: Date }[];
}

export type UnassignedReason = 'NO_SPACE' | 'NO_SPACE_BEFORE_DEADLINE';

export interface PlannedBlock {
  taskId: string;
  startAt: Date;
  endAt: Date;
}

export interface UnassignedTask {
  taskId: string;
  minutes: number;
  reason: UnassignedReason;
}

export interface ScheduleResult {
  blocks: PlannedBlock[];
  unassigned: UnassignedTask[];
  overdueTaskIds: string[];
}
