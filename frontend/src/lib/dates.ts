// Utilidades de fecha del frontend (hora local del navegador = zona del usuario, research R4).

const pad = (value: number) => String(value).padStart(2, '0');

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Lunes local (YYYY-MM-DD) de la semana que contiene `date`. */
export function mondayOf(date: Date): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return toIsoDate(monday);
}

/** Suma `weeks` semanas a un lunes YYYY-MM-DD. */
export function addWeeks(weekStart: string, weeks: number): string {
  const [year, month, day] = weekStart.split('-').map(Number);
  return toIsoDate(new Date(year, month - 1, day + weeks * 7));
}

/** Minutos desde medianoche → "HH:mm". */
export function formatHHmm(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** "HH:mm" → minutos desde medianoche, o `null` si el formato no es válido. */
export function minutesFromHHmm(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[2]) < 60 && minutes <= 1440 ? minutes : null;
}

/** Duración legible en español: "45 min", "1 h", "2 h 5 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
