import { ApiError } from '../api/client';
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '../api/tasks';
import { TaskForm } from '../components/TaskForm';
import { TaskList } from '../components/TaskList';

function errorMessage(error: unknown): string | null {
  if (!error) return null;
  return error instanceof ApiError ? error.message : 'No se pudo conectar con el servidor';
}

/** US3: gestión de tareas. */
export function TasksPage() {
  const { data: tasks = [], isLoading, error: loadError } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const mutationError =
    errorMessage(createTask.error) ??
    errorMessage(updateTask.error) ??
    errorMessage(deleteTask.error);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Tareas</h1>
        <p className="text-slate-600">
          Las tareas pendientes se reparten en tu horario por prioridad y fecha límite.
        </p>
      </header>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-medium">Nueva tarea</h2>
        <TaskForm
          submitLabel="Añadir tarea"
          disabled={createTask.isPending}
          onSubmit={(input) => createTask.mutate(input)}
        />
      </div>

      {mutationError && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {mutationError}
        </p>
      )}
      {loadError && <p className="text-sm text-red-700">{errorMessage(loadError)}</p>}
      {isLoading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : (
        <TaskList
          tasks={tasks}
          onUpdate={(id, patch, onDone) =>
            updateTask.mutate({ id, ...patch }, { onSuccess: () => onDone?.() })
          }
          onDelete={(id) => deleteTask.mutate(id)}
        />
      )}
    </section>
  );
}
