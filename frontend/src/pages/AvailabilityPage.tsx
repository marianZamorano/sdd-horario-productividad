import { useState } from 'react';
import { useCreateSlot, useDeleteSlot, useSlots, useUpdateSlot } from '../api/availability';
import { ApiError } from '../api/client';
import { SlotForm } from '../components/SlotForm';
import { formatHHmm } from '../lib/dates';
import { WEEKDAYS } from '../lib/weekdays';

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor';
}

/** US2: disponibilidad semanal (franjas por día de la semana). */
export function AvailabilityPage() {
  const { data: slots = [], isLoading, error: loadError } = useSlots();
  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();
  const deleteSlot = useDeleteSlot();
  const [editingId, setEditingId] = useState<string | null>(null);

  const mutationError =
    errorMessage(createSlot.error) ??
    errorMessage(updateSlot.error) ??
    errorMessage(deleteSlot.error);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Disponibilidad</h1>
        <p className="text-slate-600">
          Indica tus franjas libres de cada semana. El horario solo colocará tareas dentro de
          ellas.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Nueva franja</h2>
        <SlotForm
          submitLabel="Añadir franja"
          disabled={createSlot.isPending}
          onSubmit={(input) => createSlot.mutate(input)}
        />
      </div>

      {mutationError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutationError}
        </p>
      )}
      {loadError && (
        <p className="text-sm text-red-700">{errorMessage(loadError)}</p>
      )}
      {isLoading && <p className="text-slate-500">Cargando…</p>}

      {!isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WEEKDAYS.map((day) => {
            const daySlots = slots.filter((slot) => slot.weekday === day.value);
            const headingId = `weekday-${day.value}`;
            return (
              <section
                key={day.value}
                aria-labelledby={headingId}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <h3 id={headingId} className="mb-2 font-medium">
                  {day.label}
                </h3>
                {daySlots.length === 0 && <p className="text-sm text-slate-400">Sin franjas</p>}
                <ul className="space-y-2">
                  {daySlots.map((slot) =>
                    editingId === slot.id ? (
                      <li key={slot.id}>
                        <SlotForm
                          initial={slot}
                          submitLabel="Guardar"
                          disabled={updateSlot.isPending}
                          onCancel={() => setEditingId(null)}
                          onSubmit={(input) =>
                            updateSlot.mutate(
                              { id: slot.id, ...input },
                              { onSuccess: () => setEditingId(null) },
                            )
                          }
                        />
                      </li>
                    ) : (
                      <li
                        key={slot.id}
                        className="flex items-center justify-between rounded bg-indigo-50 px-2 py-1 text-sm"
                      >
                        <span>
                          {formatHHmm(slot.startMinute)} – {formatHHmm(slot.endMinute)}
                        </span>
                        <span className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(slot.id)}
                            className="text-indigo-700 hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSlot.mutate(slot.id)}
                            className="text-red-700 hover:underline"
                          >
                            Eliminar
                          </button>
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
