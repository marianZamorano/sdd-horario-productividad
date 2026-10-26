import { DateTime, IANAZone } from 'luxon';

// Utilidades puras de fecha/zona horaria (research R4). Nunca leen el reloj del sistema.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseLocalDate(date: string, timezone: string): DateTime | null {
  if (!ISO_DATE.test(date)) return null;
  const parsed = DateTime.fromISO(date, { zone: timezone });
  return parsed.isValid ? parsed : null;
}

export function isValidTimezone(timezone: string): boolean {
  return IANAZone.isValidZone(timezone);
}

/** `true` si `date` es una fecha `YYYY-MM-DD` válida que cae en lunes. */
export function isMonday(date: string): boolean {
  const parsed = parseLocalDate(date, 'UTC');
  return parsed !== null && parsed.weekday === 1;
}

/** Semana local `[lunes 00:00, lunes siguiente 00:00)` expresada como instantes UTC. */
export function weekRange(
  weekStart: string,
  timezone: string,
): { start: Date; end: Date } {
  const start = parseLocalDate(weekStart, timezone);
  if (!start) throw new Error(`Invalid weekStart: ${weekStart}`);
  return { start: start.toJSDate(), end: start.plus({ weeks: 1 }).toJSDate() };
}

/** Fecha local `YYYY-MM-DD` de un instante en la zona dada. */
export function localDateOf(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant, { zone: timezone }).toISODate() ?? '';
}

/** Último milisegundo del día local `date` (23:59:59.999) como instante UTC. */
export function endOfLocalDay(date: string, timezone: string): Date {
  const parsed = parseLocalDate(date, timezone);
  if (!parsed) throw new Error(`Invalid date: ${date}`);
  return parsed.endOf('day').toJSDate();
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/** Redondea hacia arriba al siguiente múltiplo de 5 minutos. */
export function roundUpTo5(instant: Date): Date {
  return new Date(
    Math.ceil(instant.getTime() / FIVE_MINUTES_MS) * FIVE_MINUTES_MS,
  );
}
