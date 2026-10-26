// Conversión de instantes UTC a fecha/hora local en la zona del usuario (research R4).
// Usa Intl para no añadir dependencias al frontend.

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatters.set(timezone, formatter);
  }
  return formatter;
}

/** Fecha local `YYYY-MM-DD` y minutos desde medianoche de un instante ISO. */
export function zonedParts(iso: string, timezone: string): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    formatterFor(timezone)
      .formatToParts(new Date(iso))
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** Suma días a una fecha `YYYY-MM-DD` (aritmética de calendario, sin zona). */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}
