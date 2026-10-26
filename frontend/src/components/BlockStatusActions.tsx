import { useUpdateBlockStatus } from '../api/schedule';
import type { BlockStatus, ScheduleBlockDto } from '../api/types';

interface BlockStatusActionsProps {
  block: ScheduleBlockDto;
  weekStart: string;
}

const iconButton =
  'flex h-5 w-5 items-center justify-center rounded bg-white/80 text-sm leading-none shadow-sm hover:bg-white disabled:opacity-50';

/**
 * Marca un bloque como completado / omitido o lo devuelve a planificado (US5).
 * Botones compactos en la esquina para que quepan en bloques de 25 min.
 */
export function BlockStatusActions({ block, weekStart }: BlockStatusActionsProps) {
  const update = useUpdateBlockStatus();
  const setStatus = (status: BlockStatus) =>
    update.mutate({ blockId: block.id, status, weekStart });

  return (
    <>
      <div className="absolute right-0.5 top-0.5 flex gap-0.5">
        {block.status === 'PLANNED' ? (
          <>
            <button
              type="button"
              aria-label="Completar"
              title="Completar"
              disabled={update.isPending}
              onClick={() => setStatus('COMPLETED')}
              className={`${iconButton} text-emerald-700`}
            >
              ✓
            </button>
            <button
              type="button"
              aria-label="Omitir"
              title="Omitir"
              disabled={update.isPending}
              onClick={() => setStatus('SKIPPED')}
              className={`${iconButton} text-slate-600`}
            >
              ✕
            </button>
          </>
        ) : (
          <button
            type="button"
            aria-label="Deshacer"
            title="Deshacer"
            disabled={update.isPending}
            onClick={() => setStatus('PLANNED')}
            className={`${iconButton} text-indigo-700`}
          >
            ↺
          </button>
        )}
      </div>
      {update.isError && (
        <span
          role="alert"
          className="absolute left-0 top-full z-10 mt-0.5 whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-white shadow"
        >
          No se pudo actualizar el bloque
        </span>
      )}
    </>
  );
}
