import { useState } from 'react';
import { ApiError } from '../api/client';
import { useGenerate, useWeek } from '../api/schedule';
import type { GenerateResultDto } from '../api/types';
import { UnassignedPanel } from '../components/UnassignedPanel';
import { WeekGrid } from '../components/WeekGrid';
import { addWeeks, mondayOf } from '../lib/dates';
import { addDays } from '../lib/zoned';

function formatShort(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day}/${month}`;
}

/** US4: generar el horario de la semana y verlo de lunes a domingo. */
export function WeekPage() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [lastResult, setLastResult] = useState<GenerateResultDto | null>(null);
  const { data, isLoading, error } = useWeek(weekStart);
  const generate = useGenerate();

  const result = lastResult?.weekStart === weekStart ? lastResult : null;
  const timezone = data?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const generateError =
    generate.error instanceof ApiError
      ? generate.error.message
      : generate.error
        ? 'No se pudo conectar con el servidor'
        : null;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Semana</h1>
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
        <button
          type="button"
          disabled={generate.isPending}
          onClick={() => generate.mutate(weekStart, { onSuccess: setLastResult })}
          className="ml-auto rounded bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {generate.isPending ? 'Generando…' : 'Generar horario'}
        </button>
      </header>

      {generateError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {generateError}
        </p>
      )}
      {result && !result.hasAvailability && (
        <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Define tu disponibilidad para poder generar el horario.
        </p>
      )}
      {result && result.hasAvailability && !result.hasPendingTasks && (
        <p className="rounded bg-slate-100 px-3 py-2 text-sm text-slate-700">
          No tienes tareas pendientes que planificar.
        </p>
      )}
      {result && result.createdBlocks > 0 && (
        <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Se planificaron {result.createdBlocks} bloques.
        </p>
      )}

      {error && <p className="text-sm text-red-700">No se pudo cargar la semana.</p>}
      {isLoading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : (
        <WeekGrid weekStart={weekStart} timezone={timezone} blocks={data?.blocks ?? []} />
      )}

      {result && <UnassignedPanel items={result.unassigned} />}
    </section>
  );
}
