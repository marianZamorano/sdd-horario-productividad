import { useState } from 'react';
import type { TaskInput, TaskPatch } from '../api/tasks';
import type { TaskDto } from '../api/types';
import { formatDuration } from '../lib/dates';
import { PRIORITY_LABELS, PRIORITY_STYLES } from '../lib/priorities';
import { TaskForm } from './TaskForm';

interface TaskListProps {
  tasks: TaskDto[];
  onUpdate: (id: string, patch: TaskPatch, onDone?: () => void) => void;
  onDelete: (id: string) => void;
}

function formatDeadline(deadline: string): string {
  const [year, month, day] = deadline.split('-');
  return `${day}/${month}/${year}`;
}

export function TaskList({ tasks, onUpdate, onDelete }: TaskListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return <p className="text-slate-500">Todavía no tienes tareas. Crea la primera arriba.</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const done = task.status === 'DONE';
        if (editingId === task.id) {
          const initial: TaskInput = {
            title: task.title,
            durationMinutes: task.durationMinutes,
            priority: task.priority,
            deadline: task.deadline,
            category: task.category,
          };
          return (
            <li key={task.id} className="rounded-lg border border-indigo-200 bg-white p-3">
              <TaskForm
                initial={initial}
                submitLabel="Guardar"
                onCancel={() => setEditingId(null)}
                onSubmit={(input) => onUpdate(task.id, input, () => setEditingId(null))}
              />
            </li>
          );
        }
        return (
          <li
            key={task.id}
            className={`flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 ${task.overdue ? 'border-rose-300' : 'border-slate-200'}`}
          >
            <div className="min-w-0 flex-1">
              <p className={`font-medium ${done ? 'text-slate-400 line-through' : ''}`}>
                {task.title}
              </p>
              <p className="text-sm text-slate-500">
                {done
                  ? 'Terminada'
                  : `Quedan ${formatDuration(task.remainingMinutes)} de ${formatDuration(task.durationMinutes)}`}
                {task.deadline && ` · Fecha límite ${formatDeadline(task.deadline)}`}
              </p>
            </div>
            <span className={`rounded px-2 py-0.5 text-xs ${PRIORITY_STYLES[task.priority]}`}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.category && (
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                {task.category}
              </span>
            )}
            {task.overdue && (
              <span className="rounded bg-rose-600 px-2 py-0.5 text-xs font-medium text-white">
                Vencida
              </span>
            )}
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => onUpdate(task.id, { status: done ? 'PENDING' : 'DONE' })}
                className="text-emerald-700 hover:underline"
              >
                {done ? 'Reabrir' : 'Terminar'}
              </button>
              <button
                type="button"
                onClick={() => setEditingId(task.id)}
                className="text-indigo-700 hover:underline"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Borrar "${task.title}" y todos sus bloques del horario?`)) {
                    onDelete(task.id);
                  }
                }}
                className="text-red-700 hover:underline"
              >
                Eliminar
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
