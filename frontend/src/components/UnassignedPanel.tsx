import type { UnassignedDto } from '../api/types';
import { formatDuration } from '../lib/dates';

const REASONS: Record<UnassignedDto['reason'], string> = {
  NO_SPACE: 'No hay espacio libre esta semana',
  NO_SPACE_BEFORE_DEADLINE: 'No hay espacio antes de su fecha límite',
};

/** Tareas (o minutos) que no cupieron en la semana generada (FR-015). */
export function UnassignedPanel({ items }: { items: UnassignedDto[] }) {
  if (items.length === 0) return null;
  return (
    <aside className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="mb-2 font-medium text-amber-900">Sin asignar ({items.length})</h2>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.taskId}>
            <p className="font-medium">{item.taskTitle}</p>
            <p className="text-amber-800">
              {formatDuration(item.minutes)} · {REASONS[item.reason]}
            </p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
