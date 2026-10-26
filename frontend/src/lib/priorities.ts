import type { Priority } from '../api/types';

export const PRIORITY_LABELS: Record<Priority, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

export const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'bg-rose-100 text-rose-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW: 'bg-slate-100 text-slate-700',
};
