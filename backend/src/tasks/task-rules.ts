import { endOfLocalDay } from '../common/time';

// Reglas puras de tareas (constitución III). Las comparte el generador de horario.

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface OrderableTask {
  id: string;
  priority: Priority;
  /** Fecha límite `YYYY-MM-DD` o null. */
  deadline: string | null;
  createdAt: Date;
  status: 'PENDING' | 'DONE';
}

const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Pendiente y con el final del día de su fecha límite (zona del usuario) ya pasado. */
export function isOverdue(
  task: Pick<OrderableTask, 'status' | 'deadline'>,
  now: Date,
  timezone: string,
): boolean {
  return (
    task.status === 'PENDING' &&
    task.deadline !== null &&
    endOfLocalDay(task.deadline, timezone).getTime() < now.getTime()
  );
}

/**
 * Orden del generador (FR-011): vencidas → prioridad → fecha límite (sin fecha al final)
 * → creación más antigua → id (desempate final para el determinismo de FR-017).
 */
export function compareTasks(now: Date, timezone: string) {
  return (a: OrderableTask, b: OrderableTask): number => {
    const overdue =
      Number(isOverdue(b, now, timezone)) - Number(isOverdue(a, now, timezone));
    if (overdue !== 0) return overdue;

    const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priority !== 0) return priority;

    if (a.deadline !== b.deadline) {
      if (a.deadline === null) return 1;
      if (b.deadline === null) return -1;
      return a.deadline < b.deadline ? -1 : 1;
    }

    const created = a.createdAt.getTime() - b.createdAt.getTime();
    if (created !== 0) return created;

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

/** FR-007: duración estimada menos minutos de bloques completados (nunca negativo). */
export function remainingMinutes(
  durationMinutes: number,
  completedMinutes: number,
): number {
  return Math.max(0, durationMinutes - completedMinutes);
}
