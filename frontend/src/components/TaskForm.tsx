import { useState, type FormEvent } from 'react';
import type { TaskInput } from '../api/tasks';
import type { Priority } from '../api/types';
import { PRIORITY_LABELS } from '../lib/priorities';

interface TaskFormProps {
  initial?: TaskInput;
  submitLabel: string;
  onSubmit: (input: TaskInput) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

/** Formulario de tarea con las reglas de FR-006 (validación en español). */
export function TaskForm({ initial, submitLabel, onSubmit, onCancel, disabled }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [duration, setDuration] = useState(String(initial?.durationMinutes ?? 60));
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'MEDIUM');
  const [deadline, setDeadline] = useState(initial?.deadline ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [errors, setErrors] = useState<string[]>([]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const durationMinutes = Number(duration);
    const nextErrors: string[] = [];
    if (title.trim().length === 0) nextErrors.push('El título es obligatorio');
    if (title.trim().length > 120) nextErrors.push('El título admite como máximo 120 caracteres');
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 15 ||
      durationMinutes > 1440 ||
      durationMinutes % 5 !== 0
    ) {
      nextErrors.push('La duración debe ser un múltiplo de 5 entre 15 y 1440 minutos');
    }
    if (category.trim().length > 40) {
      nextErrors.push('La categoría admite como máximo 40 caracteres');
    }
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;

    onSubmit({
      title: title.trim(),
      durationMinutes,
      priority,
      deadline: deadline || null,
      category: category.trim() || null,
    });
    if (!initial) {
      setTitle('');
      setCategory('');
      setDeadline('');
    }
  }

  const fieldClass = 'mt-1 block w-full rounded border border-slate-300 px-2 py-1.5';

  return (
    <form noValidate onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-6">
      <label className="text-sm text-slate-700 sm:col-span-2">
        Título
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
      </label>
      <label className="text-sm text-slate-700">
        Duración (min)
        <input
          type="number"
          min={15}
          max={1440}
          step={5}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="text-sm text-slate-700">
        Prioridad
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className={fieldClass}
        >
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((value) => (
            <option key={value} value={value}>
              {PRIORITY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-700">
        Fecha límite
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className={fieldClass}
        />
      </label>
      <label className="text-sm text-slate-700">
        Categoría
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={fieldClass}
        />
      </label>
      <div className="flex items-center gap-2 sm:col-span-6">
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
      </div>
      {errors.length > 0 && (
        <ul className="text-sm text-red-600 sm:col-span-6">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
