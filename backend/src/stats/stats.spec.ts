import { computeWeekStats, type StatsBlock } from './stats';

// spec.md US6 (escenarios 1–4) · FR-020 a FR-022
const TZ = 'America/La_Paz'; // UTC-4
const NOW = new Date('2026-11-05T16:00:00.000Z'); // jueves 12:00 local

/** Bloque que empieza a las 18:00 local del día `date`. */
function block(
  date: string,
  minutes: number,
  status: StatsBlock['status'],
): StatsBlock {
  const startAt = new Date(`${date}T22:00:00.000Z`);
  return {
    startAt,
    endAt: new Date(startAt.getTime() + minutes * 60_000),
    status,
  };
}

const base = {
  tasksCompletedInWeek: 0,
  completedBlockStarts: [],
  now: NOW,
  timezone: TZ,
};

describe('computeWeekStats (US6)', () => {
  it('escenario 1: 10 bloques, 6 completados y 2 omitidos → 60 %', () => {
    const weekBlocks = [
      ...Array.from({ length: 6 }, () => block('2026-11-02', 50, 'COMPLETED')),
      block('2026-11-03', 50, 'SKIPPED'),
      block('2026-11-03', 50, 'SKIPPED'),
      block('2026-11-04', 50, 'PLANNED'),
      block('2026-11-04', 50, 'PLANNED'),
    ];
    expect(computeWeekStats({ ...base, weekBlocks })).toMatchObject({
      totalBlocks: 10,
      completedBlocks: 6,
      skippedBlocks: 2,
      completionRate: 60,
    });
  });

  it('escenario 2: horas planificadas (todos los estados) frente a completadas', () => {
    const weekBlocks = [
      ...Array.from({ length: 6 }, () => block('2026-11-02', 50, 'COMPLETED')), // 300 min
      block('2026-11-03', 50, 'SKIPPED'),
      block('2026-11-03', 50, 'PLANNED'),
      block('2026-11-04', 40, 'PLANNED'),
      block('2026-11-04', 40, 'PLANNED'),
    ];
    expect(computeWeekStats({ ...base, weekBlocks })).toMatchObject({
      plannedMinutes: 480,
      completedMinutes: 300,
    });
  });

  it('escenario 3: completados ayer, anteayer y hoy → racha de 3', () => {
    const completedBlockStarts = ['2026-11-03', '2026-11-04', '2026-11-05'].map(
      (d) => new Date(`${d}T14:00:00.000Z`), // 10:00 local
    );
    const stats = computeWeekStats({
      ...base,
      weekBlocks: [],
      completedBlockStarts,
    });
    expect(stats.streakDays).toBe(3);
  });

  it('cuenta desde ayer si hoy aún no hay bloques completados', () => {
    const completedBlockStarts = ['2026-11-03', '2026-11-04'].map(
      (d) => new Date(`${d}T22:00:00.000Z`),
    );
    expect(
      computeWeekStats({ ...base, weekBlocks: [], completedBlockStarts })
        .streakDays,
    ).toBe(2);
  });

  it('un día sin completar rompe la racha', () => {
    const completedBlockStarts = ['2026-11-01', '2026-11-02', '2026-11-05'].map(
      (d) => new Date(`${d}T14:00:00.000Z`),
    );
    expect(
      computeWeekStats({ ...base, weekBlocks: [], completedBlockStarts })
        .streakDays,
    ).toBe(1);
  });

  it('racha 0 si no hubo completados ni hoy ni ayer', () => {
    const completedBlockStarts = [new Date('2026-11-02T14:00:00.000Z')];
    expect(
      computeWeekStats({ ...base, weekBlocks: [], completedBlockStarts })
        .streakDays,
    ).toBe(0);
  });

  it('usa la fecha local del usuario: 23:30 local del miércoles cuenta como miércoles', () => {
    // 2026-11-05T03:30Z = miércoles 23:30 en La Paz
    const completedBlockStarts = [
      new Date('2026-11-05T03:30:00.000Z'),
      new Date('2026-11-05T14:00:00.000Z'), // jueves 10:00 local
    ];
    expect(
      computeWeekStats({ ...base, weekBlocks: [], completedBlockStarts })
        .streakDays,
    ).toBe(2);
  });

  it('escenario 4: semana vacía → métricas en cero', () => {
    expect(computeWeekStats({ ...base, weekBlocks: [] })).toEqual({
      totalBlocks: 0,
      completedBlocks: 0,
      skippedBlocks: 0,
      completionRate: 0,
      plannedMinutes: 0,
      completedMinutes: 0,
      tasksCompleted: 0,
      streakDays: 0,
    });
  });

  it('redondea el porcentaje a entero y pasa las tareas terminadas', () => {
    const weekBlocks = [
      block('2026-11-02', 25, 'COMPLETED'),
      block('2026-11-02', 25, 'PLANNED'),
      block('2026-11-02', 25, 'PLANNED'),
    ];
    expect(
      computeWeekStats({ ...base, weekBlocks, tasksCompletedInWeek: 4 }),
    ).toMatchObject({ completionRate: 33, tasksCompleted: 4 });
  });
});
