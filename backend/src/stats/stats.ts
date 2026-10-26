import { DateTime } from 'luxon';
import { localDateOf } from '../common/time';

// Métricas de productividad: función pura (constitución III, data-model.md §WeekStats).

export interface StatsBlock {
  startAt: Date;
  endAt: Date;
  status: 'PLANNED' | 'COMPLETED' | 'SKIPPED';
}

export interface WeekStatsInput {
  weekBlocks: StatsBlock[];
  tasksCompletedInWeek: number;
  /** Inicio de todos los bloques completados del usuario (para la racha). */
  completedBlockStarts: Date[];
  now: Date;
  timezone: string;
}

export interface WeekStats {
  totalBlocks: number;
  completedBlocks: number;
  skippedBlocks: number;
  completionRate: number;
  plannedMinutes: number;
  completedMinutes: number;
  tasksCompleted: number;
  streakDays: number;
}

const minutesOf = (b: StatsBlock) =>
  Math.round((b.endAt.getTime() - b.startAt.getTime()) / 60_000);

/**
 * FR-022: días consecutivos con al menos un bloque completado (por fecha local de inicio
 * del bloque), contando desde hoy o desde ayer si hoy aún no hay ninguno.
 */
export function computeStreak(
  completedBlockStarts: Date[],
  now: Date,
  timezone: string,
): number {
  const days = new Set(
    completedBlockStarts.map((d) => localDateOf(d, timezone)),
  );
  let cursor = DateTime.fromJSDate(now, { zone: timezone }).startOf('day');
  if (!days.has(cursor.toISODate()!)) cursor = cursor.minus({ days: 1 });

  let streak = 0;
  while (days.has(cursor.toISODate()!)) {
    streak++;
    cursor = cursor.minus({ days: 1 });
  }
  return streak;
}

export function computeWeekStats(input: WeekStatsInput): WeekStats {
  const completed = input.weekBlocks.filter((b) => b.status === 'COMPLETED');
  const totalBlocks = input.weekBlocks.length;
  return {
    totalBlocks,
    completedBlocks: completed.length,
    skippedBlocks: input.weekBlocks.filter((b) => b.status === 'SKIPPED')
      .length,
    completionRate:
      totalBlocks === 0
        ? 0
        : Math.round((completed.length / totalBlocks) * 100),
    plannedMinutes: input.weekBlocks.reduce((sum, b) => sum + minutesOf(b), 0),
    // Se cuenta la duración planificada completa del bloque (clarificación 2026-10-26).
    completedMinutes: completed.reduce((sum, b) => sum + minutesOf(b), 0),
    tasksCompleted: input.tasksCompletedInWeek,
    streakDays: computeStreak(
      input.completedBlockStarts,
      input.now,
      input.timezone,
    ),
  };
}
