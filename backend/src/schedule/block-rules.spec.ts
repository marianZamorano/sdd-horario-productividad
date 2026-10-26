import { nextTaskStatus } from './block-rules';

// FR-008 · data-model.md §Transiciones de estado de Task
const NOW = new Date('2026-11-02T23:00:00.000Z');
const EARLIER = new Date('2026-11-01T12:00:00.000Z');

describe('nextTaskStatus (US5)', () => {
  const pending = {
    status: 'PENDING' as const,
    durationMinutes: 100,
    completedAt: null,
  };
  const done = {
    status: 'DONE' as const,
    durationMinutes: 100,
    completedAt: EARLIER,
  };

  it('pasa a DONE cuando los minutos completados alcanzan la duración', () => {
    expect(
      nextTaskStatus({
        task: pending,
        completedMinutes: 100,
        blockLeftCompleted: false,
        now: NOW,
      }),
    ).toEqual({ status: 'DONE', completedAt: NOW });
  });

  it('también si los completados superan la duración', () => {
    expect(
      nextTaskStatus({
        task: pending,
        completedMinutes: 120,
        blockLeftCompleted: false,
        now: NOW,
      }),
    ).toEqual({ status: 'DONE', completedAt: NOW });
  });

  it('sigue PENDING mientras falten minutos', () => {
    expect(
      nextTaskStatus({
        task: pending,
        completedMinutes: 50,
        blockLeftCompleted: false,
        now: NOW,
      }),
    ).toEqual({ status: 'PENDING', completedAt: null });
  });

  it('conserva la fecha original si ya estaba DONE y sigue completa', () => {
    expect(
      nextTaskStatus({
        task: done,
        completedMinutes: 100,
        blockLeftCompleted: false,
        now: NOW,
      }),
    ).toEqual({ status: 'DONE', completedAt: EARLIER });
  });

  it('reabre la tarea si un bloque deja de estar completado y ya no alcanza', () => {
    expect(
      nextTaskStatus({
        task: done,
        completedMinutes: 50,
        blockLeftCompleted: true,
        now: NOW,
      }),
    ).toEqual({ status: 'PENDING', completedAt: null });
  });

  it('no reabre una tarea terminada a mano por cambios que no quitan un completado', () => {
    // Terminada manualmente con 0 minutos: marcar un bloque omitido no la reabre.
    expect(
      nextTaskStatus({
        task: done,
        completedMinutes: 0,
        blockLeftCompleted: false,
        now: NOW,
      }),
    ).toEqual({ status: 'DONE', completedAt: EARLIER });
  });
});
