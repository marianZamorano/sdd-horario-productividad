import type { CSSProperties, ReactNode } from 'react';
import type { BlockStatus, ScheduleBlockDto } from '../api/types';
import { formatHHmm } from '../lib/dates';

const STATUS_STYLES: Record<BlockStatus, string> = {
  PLANNED: 'border-indigo-300 bg-indigo-50',
  COMPLETED: 'border-emerald-300 bg-emerald-50',
  SKIPPED: 'border-slate-300 bg-slate-100 text-slate-500',
};

const STATUS_LABELS: Record<BlockStatus, string | null> = {
  PLANNED: null,
  COMPLETED: 'Completado',
  SKIPPED: 'Omitido',
};

interface BlockCardProps {
  block: ScheduleBlockDto;
  /** Minutos desde medianoche local en que empieza el bloque. */
  startMinutes: number;
  style?: CSSProperties;
  actions?: ReactNode;
}

export function BlockCard({ block, startMinutes, style, actions }: BlockCardProps) {
  const statusLabel = STATUS_LABELS[block.status];
  const time = `${formatHHmm(startMinutes)} – ${formatHHmm(startMinutes + block.durationMinutes)}`;
  return (
    <article
      style={style}
      title={`${block.taskTitle} · ${time}`}
      className={`overflow-hidden rounded border px-1.5 py-0.5 text-xs leading-4 shadow-sm ${STATUS_STYLES[block.status]} ${block.overdue ? 'border-l-4 border-l-rose-500' : ''}`}
    >
      <p className={`truncate font-medium ${block.status === 'SKIPPED' ? 'line-through' : ''}`}>
        {block.taskTitle}
      </p>
      <p className="flex flex-wrap items-center gap-x-1 text-slate-600">
        <span>{time}</span>
        {statusLabel && <span className="font-medium text-slate-800">{statusLabel}</span>}
        {block.overdue && (
          <span className="rounded bg-rose-600 px-1 font-medium text-white">Vencida</span>
        )}
      </p>
      {actions}
    </article>
  );
}
