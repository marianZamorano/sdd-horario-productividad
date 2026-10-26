import { useState } from 'react';
import { useWeekStats } from '../api/stats';
import { StatCard } from '../components/StatCard';
import { addWeeks, mondayOf } from '../lib/dates';
import { addDays } from '../lib/zoned';

/** Horas legibles: 300 min → "5 h", 90 min → "1,5 h". */
function formatHours(minutes: number): string {
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours.toLocaleString('es')} h`;
}

function formatShort(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day}/${month}`;
}

/** US6: panel de productividad de la semana seleccionada. */
export function StatsPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const { data, isLoading, error } = useWeekStats(weekStart);

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Productividad</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addWeeks(w, -1))}
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
          >
            ← Semana anterior
          </button>
          <span className="font-medium">
            {formatShort(weekStart)} – {formatShort(addDays(weekStart, 6))}
          </span>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addWeeks(w, 1))}
            className="rounded border border-slate-300 px-2 py-1 hover:bg-slate-100"
          >
            Semana siguiente →
          </button>
        </div>
      </header>

      {isLoading && <p className="text-slate-500">Cargando…</p>}
      {error && <p className="text-sm text-red-700">No se pudieron cargar las métricas.</p>}

      {data && (
        <>
          {data.totalBlocks === 0 && (
            <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Aún no hay bloques esta semana. Genera tu horario en "Semana".
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Bloques completados"
              value={`${data.completionRate} %`}
              detail={`${data.completedBlocks} de ${data.totalBlocks} bloques completados`}
            />
            <StatCard
              title="Horas completadas / planificadas"
              value={`${formatHours(data.completedMinutes)} / ${formatHours(data.plannedMinutes)}`}
              detail={
                data.skippedBlocks === 0
                  ? undefined
                  : `${data.skippedBlocks} ${data.skippedBlocks === 1 ? 'bloque omitido' : 'bloques omitidos'}`
              }
            />
            <StatCard title="Tareas terminadas" value={String(data.tasksCompleted)} />
            <StatCard
              title="Racha actual"
              value={`${data.streakDays} ${data.streakDays === 1 ? 'día' : 'días'}`}
              detail="Días seguidos con al menos un bloque completado"
            />
          </div>
        </>
      )}
    </section>
  );
}
