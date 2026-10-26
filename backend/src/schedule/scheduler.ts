import { DateTime } from 'luxon';
import { endOfLocalDay, roundUpTo5 } from '../common/time';
import { compareTasks, isOverdue } from '../tasks/task-rules';
import {
  BREAK,
  MAX_BLOCK,
  MIN_BLOCK,
  type PlannedBlock,
  type ScheduleResult,
  type SchedulerInput,
  type SchedulerSlot,
  type UnassignedTask,
} from './scheduler.types';

// Generador de horario: función pura y determinista (constitución III, research R5).
// No hace I/O ni lee el reloj: `now` y la zona horaria llegan como parámetros.

const MINUTE = 60_000;

interface Interval {
  start: number; // ms UTC
  end: number;
}

/** Instante UTC de `minutes` desde la medianoche local de `day` (1440 = medianoche siguiente). */
function localInstant(day: DateTime, minutes: number): number {
  if (minutes >= 1440) return day.plus({ days: 1 }).startOf('day').toMillis();
  return day
    .set({ hour: Math.floor(minutes / 60), minute: minutes % 60 })
    .toMillis();
}

/** Intervalos libres de la semana a partir de las franjas, ordenados y fusionados. */
function weekIntervals(
  slots: SchedulerSlot[],
  weekStart: string,
  timezone: string,
): Interval[] {
  const monday = DateTime.fromISO(weekStart, { zone: timezone }).startOf('day');
  const intervals = slots
    .map((slot) => {
      const day = monday.plus({ days: slot.weekday - 1 });
      return {
        start: localInstant(day, slot.startMinute),
        end: localInstant(day, slot.endMinute),
      };
    })
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  // Franjas contiguas forman un único hueco: así el descanso también aplica en la frontera.
  const merged: Interval[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end)
      last.end = Math.max(last.end, interval.end);
    else merged.push({ ...interval });
  }
  return merged;
}

/** Resta `occupied` (ya ampliado con el descanso) a cada intervalo. */
function subtract(intervals: Interval[], occupied: Interval[]): Interval[] {
  let result = intervals;
  for (const busy of occupied) {
    result = result.flatMap((free) => {
      if (busy.end <= free.start || busy.start >= free.end) return [free];
      const parts: Interval[] = [];
      if (busy.start > free.start)
        parts.push({ start: free.start, end: busy.start });
      if (busy.end < free.end) parts.push({ start: busy.end, end: free.end });
      return parts;
    });
  }
  return result;
}

/**
 * Tamaño del siguiente bloque (FR-013): min(50, hueco, pendiente); si el resto quedaría entre
 * 1 y 24 min se acorta para dejar 25; una tarea con menos de 25 min va entera. 0 = no cabe.
 */
function blockSize(pending: number, gap: number): number {
  if (pending < MIN_BLOCK) return gap >= pending ? pending : 0;
  let size = Math.min(MAX_BLOCK, gap, pending);
  const rest = pending - size;
  if (rest > 0 && rest < MIN_BLOCK) size = pending - MIN_BLOCK;
  return size >= MIN_BLOCK ? size : 0;
}

export function generateSchedule(input: SchedulerInput): ScheduleResult {
  const { now, timezone } = input;
  const earliest = roundUpTo5(now).getTime();

  const occupied = input.keptBlocks.map((b) => ({
    start: b.startAt.getTime() - BREAK * MINUTE,
    end: b.endAt.getTime() + BREAK * MINUTE,
  }));
  const free = subtract(
    weekIntervals(input.slots, input.weekStart, timezone)
      .map((i) => ({ start: Math.max(i.start, earliest), end: i.end }))
      .filter((i) => i.end > i.start),
    occupied,
  );

  const tasks = input.tasks
    .filter((t) => t.pendingMinutes > 0)
    .map((t) => ({ ...t, status: 'PENDING' as const }))
    .sort(compareTasks(now, timezone));

  const blocks: PlannedBlock[] = [];
  const unassigned: UnassignedTask[] = [];
  const overdueTaskIds: string[] = [];

  for (const task of tasks) {
    const overdue = isOverdue(task, now, timezone);
    if (overdue) overdueTaskIds.push(task.id);
    // Las vencidas no tienen límite (FR-014); el resto termina al final de su fecha límite.
    const limit =
      overdue || task.deadline === null
        ? Number.POSITIVE_INFINITY
        : endOfLocalDay(task.deadline, timezone).getTime() + 1;

    let pending = task.pendingMinutes;
    for (const interval of free) {
      while (pending > 0) {
        const gapEnd = Math.min(interval.end, limit);
        const gap = Math.floor((gapEnd - interval.start) / MINUTE);
        const size = gap > 0 ? blockSize(pending, gap) : 0;
        if (size === 0) break;

        const startAt = interval.start;
        const endAt = startAt + size * MINUTE;
        blocks.push({
          taskId: task.id,
          startAt: new Date(startAt),
          endAt: new Date(endAt),
        });
        pending -= size;
        interval.start = endAt + BREAK * MINUTE;
      }
      if (pending === 0) break;
    }

    if (pending > 0) {
      const spaceAfterDeadline =
        Number.isFinite(limit) &&
        free.some(
          (i) =>
            i.end > limit &&
            (i.end - Math.max(i.start, limit)) / MINUTE >=
              Math.min(pending, MIN_BLOCK),
        );
      unassigned.push({
        taskId: task.id,
        minutes: pending,
        reason: spaceAfterDeadline ? 'NO_SPACE_BEFORE_DEADLINE' : 'NO_SPACE',
      });
    }
  }

  blocks.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return { blocks, unassigned, overdueTaskIds };
}
