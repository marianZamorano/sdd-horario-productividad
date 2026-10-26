import { useState, type FormEvent } from 'react';
import type { SlotInput } from '../api/availability';
import { formatHHmm, minutesFromHHmm } from '../lib/dates';
import { WEEKDAYS } from '../lib/weekdays';

interface SlotFormProps {
  initial?: SlotInput;
  submitLabel: string;
  onSubmit: (input: SlotInput) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

/** Formulario de franja: día + horas en pasos de 15 min (FR-004, FR-005). */
export function SlotForm({ initial, submitLabel, onSubmit, onCancel, disabled }: SlotFormProps) {
  const [weekday, setWeekday] = useState(initial?.weekday ?? 1);
  const [start, setStart] = useState(formatHHmm(initial?.startMinute ?? 1080));
  const [end, setEnd] = useState(formatHHmm(initial?.endMinute ?? 1320));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const startMinute = minutesFromHHmm(start);
    const endMinute = minutesFromHHmm(end === '00:00' ? '24:00' : end);
    if (startMinute === null || endMinute === null) {
      setError('Introduce horas válidas (HH:mm)');
      return;
    }
    if (startMinute % 15 !== 0 || endMinute % 15 !== 0) {
      setError('Las horas deben ir en intervalos de 15 minutos');
      return;
    }
    if (endMinute <= startMinute) {
      setError('La hora de fin debe ser posterior a la de inicio');
      return;
    }
    setError(null);
    onSubmit({ weekday: weekday as SlotInput['weekday'], startMinute, endMinute });
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-slate-700">
        Día
        <select
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value) as SlotInput['weekday'])}
          className="mt-1 block rounded border border-slate-300 px-2 py-1.5"
        >
          {WEEKDAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-700">
        Desde
        <input
          type="time"
          step={900}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="mt-1 block rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <label className="text-sm text-slate-700">
        Hasta
        <input
          type="time"
          step={900}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="mt-1 block rounded border border-slate-300 px-2 py-1"
        />
      </label>
      <button
        type="submit"
        disabled={disabled}
        className="rounded bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {submitLabel}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
        >
          Cancelar
        </button>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
