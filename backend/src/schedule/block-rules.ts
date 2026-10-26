// Regla pura de FR-008 al cambiar el estado de un bloque (data-model.md §Transiciones de Task).

export interface TaskCompletionState {
  status: 'PENDING' | 'DONE';
  durationMinutes: number;
  completedAt: Date | null;
}

export interface NextTaskStatusInput {
  task: TaskCompletionState;
  /** Minutos de bloques COMPLETED de la tarea tras el cambio. */
  completedMinutes: number;
  /** El bloque modificado estaba COMPLETED y ya no lo está. */
  blockLeftCompleted: boolean;
  now: Date;
}

export function nextTaskStatus({
  task,
  completedMinutes,
  blockLeftCompleted,
  now,
}: NextTaskStatusInput): Pick<TaskCompletionState, 'status' | 'completedAt'> {
  if (completedMinutes >= task.durationMinutes) {
    return {
      status: 'DONE',
      completedAt: task.status === 'DONE' ? task.completedAt : now,
    };
  }
  // Solo se reabre si se quita un completado; una tarea terminada a mano se respeta.
  if (task.status === 'DONE' && blockLeftCompleted) {
    return { status: 'PENDING', completedAt: null };
  }
  return { status: task.status, completedAt: task.completedAt };
}
