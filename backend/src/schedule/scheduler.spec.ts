import { DateTime } from 'luxon';
import { generateSchedule } from './scheduler';
import type {
  ScheduleResult,
  SchedulerInput,
  SchedulerSlot,
  SchedulerTask,
} from './scheduler.types';

// Escenarios de spec.md US4 (1–7), casos límite y propiedades (FR-011 a FR-017).

const TZ = 'America/La_Paz'; // UTC-4 todo el año
const WEEK = '2026-11-02'; // lunes
const BEFORE_WEEK = new Date('2026-10-26T16:00:00.000Z'); // lunes anterior, 12:00 local
const DAYS = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

const hm = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};

const slot = (weekday: number, from: string, to: string): SchedulerSlot => ({
  weekday,
  startMinute: hm(from),
  endMinute: to === '24:00' ? 1440 : hm(to),
});

let seq = 0;
const task = (overrides: Partial<SchedulerTask> = {}): SchedulerTask => ({
  id: `t${String(++seq).padStart(3, '0')}`,
  pendingMinutes: 50,
  priority: 'MEDIUM',
  deadline: null,
  createdAt: new Date(`2026-10-01T00:00:00.000Z`),
  ...overrides,
});

/** Instante UTC de un día de la semana (1–7) y hora local. */
const at = (weekday: number, time: string) =>
  DateTime.fromISO(WEEK, { zone: TZ })
    .plus({ days: weekday - 1 })
    .set({ hour: Math.floor(hm(time) / 60), minute: hm(time) % 60 })
    .toJSDate();

function input(overrides: Partial<SchedulerInput>): SchedulerInput {
  return {
    now: BEFORE_WEEK,
    timezone: TZ,
    weekStart: WEEK,
    slots: [],
    tasks: [],
    keptBlocks: [],
    ...overrides,
  };
}

/** Representación legible: "t001 lun 18:00-18:50". */
function describeBlocks(result: ScheduleResult): string[] {
  return result.blocks.map((b) => {
    const start = DateTime.fromJSDate(b.startAt, { zone: TZ });
    const end = DateTime.fromJSDate(b.endAt, { zone: TZ });
    return `${b.taskId} ${DAYS[start.weekday]} ${start.toFormat('HH:mm')}-${end.toFormat('HH:mm')}`;
  });
}

const minutesOf = (b: { startAt: Date; endAt: Date }) =>
  (b.endAt.getTime() - b.startAt.getTime()) / 60_000;

describe('generateSchedule (US4)', () => {
  beforeEach(() => {
    seq = 0;
  });

  it('escenario 1: prioridad alta primero y 5 min de descanso entre bloques', () => {
    const b = task({ priority: 'LOW' });
    const a = task({ priority: 'HIGH' });
    const result = generateSchedule(
      input({ slots: [slot(1, '18:00', '20:00')], tasks: [b, a] }),
    );
    expect(describeBlocks(result)).toEqual([
      `${a.id} lun 18:00-18:50`,
      `${b.id} lun 18:55-19:45`,
    ]);
    expect(result.unassigned).toEqual([]);
  });

  it('escenario 2: a igual prioridad, fecha límite más cercana primero', () => {
    const friday = task({ deadline: '2026-11-06' });
    const wednesday = task({ deadline: '2026-11-04' });
    const result = generateSchedule(
      input({ slots: [slot(1, '18:00', '20:00')], tasks: [friday, wednesday] }),
    );
    expect(describeBlocks(result)[0]).toBe(`${wednesday.id} lun 18:00-18:50`);
  });

  it('escenario 3: 120 min se parten en 50 + 45 + 25', () => {
    const t = task({ pendingMinutes: 120 });
    const result = generateSchedule(
      input({ slots: [slot(1, '18:00', '22:00')], tasks: [t] }),
    );
    expect(describeBlocks(result)).toEqual([
      `${t.id} lun 18:00-18:50`,
      `${t.id} lun 18:55-19:40`,
      `${t.id} lun 19:45-20:10`,
    ]);
  });

  it('60 min se parten en 35 + 25 para no dejar un resto menor de 25', () => {
    const t = task({ pendingMinutes: 60 });
    const result = generateSchedule(
      input({ slots: [slot(1, '18:00', '22:00')], tasks: [t] }),
    );
    expect(result.blocks.map(minutesOf)).toEqual([35, 25]);
  });

  it('una tarea de menos de 25 min va en un único bloque de su duración', () => {
    const t = task({ pendingMinutes: 15 });
    const result = generateSchedule(
      input({ slots: [slot(2, '09:00', '10:00')], tasks: [t] }),
    );
    expect(describeBlocks(result)).toEqual([`${t.id} mar 09:00-09:15`]);
  });

  it('escenario 4: lo que no cabe va a sin asignar con NO_SPACE', () => {
    const big = task({ priority: 'HIGH', pendingMinutes: 100 });
    const other = task({ priority: 'LOW', pendingMinutes: 50 });
    const result = generateSchedule(
      input({ slots: [slot(1, '18:00', '19:00')], tasks: [big, other] }),
    );
    // 60 min libres: bloque de 50 y queda un hueco de 5 min (no sirve).
    expect(result.blocks.map((b) => b.taskId)).toEqual([big.id]);
    expect(result.unassigned).toEqual([
      { taskId: big.id, minutes: 50, reason: 'NO_SPACE' },
      { taskId: other.id, minutes: 50, reason: 'NO_SPACE' },
    ]);
  });

  it('una tarea más larga que cualquier franja se reparte entre días', () => {
    const t = task({ pendingMinutes: 90 });
    const result = generateSchedule(
      input({
        slots: [slot(1, '18:00', '18:45'), slot(3, '18:00', '18:45')],
        tasks: [t],
      }),
    );
    expect(describeBlocks(result)).toEqual([
      `${t.id} lun 18:00-18:45`,
      `${t.id} mié 18:00-18:45`,
    ]);
  });

  it('escenario 5: respeta los bloques conservados y su descanso', () => {
    const t = task({ pendingMinutes: 100 });
    const result = generateSchedule(
      input({
        slots: [slot(1, '18:00', '20:00')],
        tasks: [t],
        keptBlocks: [{ startAt: at(1, '18:30'), endAt: at(1, '19:00') }],
      }),
    );
    // Hueco 18:00-18:25 (25 min) y desde 19:05 hasta 20:00 (55 min).
    expect(describeBlocks(result)).toEqual([
      `${t.id} lun 18:00-18:25`,
      `${t.id} lun 19:05-19:55`,
    ]);
    expect(result.unassigned).toEqual([
      { taskId: t.id, minutes: 25, reason: 'NO_SPACE' },
    ]);
  });

  it('escenario 6: no coloca bloques después de la fecha límite', () => {
    const t = task({ pendingMinutes: 100, deadline: '2026-11-03' }); // martes
    const result = generateSchedule(
      input({
        slots: [slot(2, '18:00', '19:00'), slot(4, '18:00', '22:00')],
        tasks: [t],
      }),
    );
    expect(describeBlocks(result)).toEqual([`${t.id} mar 18:00-18:50`]);
    expect(result.unassigned).toEqual([
      { taskId: t.id, minutes: 50, reason: 'NO_SPACE_BEFORE_DEADLINE' },
    ]);
  });

  it('escenario 7: las vencidas van primero, sin límite de fecha, y se informan', () => {
    const now = at(1, '08:00');
    const overdue = task({ priority: 'LOW', deadline: '2026-10-30' });
    const high = task({ priority: 'HIGH' });
    const result = generateSchedule(
      input({
        now,
        slots: [slot(1, '18:00', '20:00')],
        tasks: [high, overdue],
      }),
    );
    expect(describeBlocks(result)).toEqual([
      `${overdue.id} lun 18:00-18:50`,
      `${high.id} lun 18:55-19:45`,
    ]);
    expect(result.overdueTaskIds).toEqual([overdue.id]);
  });

  it('a mitad de semana no coloca bloques en el pasado (now redondeado a 5 min)', () => {
    const t = task({ pendingMinutes: 50 });
    const result = generateSchedule(
      input({
        now: new Date(at(1, '18:02').getTime() + 30_000),
        slots: [slot(1, '18:00', '20:00')],
        tasks: [t],
      }),
    );
    expect(describeBlocks(result)).toEqual([`${t.id} lun 18:05-18:55`]);
  });

  it('una semana completamente pasada no recibe bloques', () => {
    const t = task();
    const result = generateSchedule(
      input({
        now: new Date('2026-11-20T00:00:00.000Z'),
        slots: [slot(1, '18:00', '20:00')],
        tasks: [t],
      }),
    );
    expect(result.blocks).toEqual([]);
    expect(result.unassigned).toEqual([
      { taskId: t.id, minutes: 50, reason: 'NO_SPACE' },
    ]);
  });

  it('salta huecos donde no cabe un bloque válido', () => {
    const t = task({ pendingMinutes: 45 });
    const result = generateSchedule(
      input({
        slots: [slot(1, '18:00', '18:30'), slot(2, '18:00', '19:00')],
        tasks: [t],
      }),
    );
    // Con 30 min el resto quedaría en 15 (< 25), así que pasa al martes completo.
    expect(describeBlocks(result)).toEqual([`${t.id} mar 18:00-18:45`]);
  });

  it('sin franjas: todo queda sin asignar', () => {
    const t = task();
    const result = generateSchedule(input({ tasks: [t] }));
    expect(result.blocks).toEqual([]);
    expect(result.unassigned).toEqual([
      { taskId: t.id, minutes: 50, reason: 'NO_SPACE' },
    ]);
  });

  it('sin tareas: resultado vacío', () => {
    expect(
      generateSchedule(input({ slots: [slot(1, '18:00', '20:00')] })),
    ).toEqual({ blocks: [], unassigned: [], overdueTaskIds: [] });
  });

  it('ignora tareas sin minutos pendientes', () => {
    const result = generateSchedule(
      input({
        slots: [slot(1, '18:00', '20:00')],
        tasks: [task({ pendingMinutes: 0 })],
      }),
    );
    expect(result).toEqual({ blocks: [], unassigned: [], overdueTaskIds: [] });
  });

  it('acepta franjas que terminan a medianoche', () => {
    const t = task({ pendingMinutes: 50 });
    const result = generateSchedule(
      input({ slots: [slot(7, '23:00', '24:00')], tasks: [t] }),
    );
    expect(describeBlocks(result)).toEqual([`${t.id} dom 23:00-23:50`]);
  });

  it('es determinista: mismas entradas → mismo resultado (FR-017)', () => {
    const make = () =>
      input({
        slots: [slot(1, '18:00', '22:00'), slot(6, '09:00', '13:00')],
        tasks: [
          task({ id: 'b', pendingMinutes: 80 }),
          task({ id: 'a', pendingMinutes: 80 }),
          task({ id: 'c', pendingMinutes: 30, priority: 'HIGH' }),
        ],
      });
    expect(generateSchedule(make())).toEqual(generateSchedule(make()));
  });

  describe('propiedades con entradas aleatorias (SC-003)', () => {
    // Generador pseudoaleatorio con semilla para que el test sea reproducible.
    function rng(seed: number) {
      let state = seed;
      return () => {
        state = (state * 1103515245 + 12345) % 2147483648;
        return state / 2147483648;
      };
    }

    for (let run = 1; run <= 40; run++) {
      it(`caso aleatorio #${run}: sin solapes, dentro de franjas, tamaños y fechas válidos`, () => {
        const random = rng(run);
        const pick = <T>(items: T[]) =>
          items[Math.floor(random() * items.length)];
        const slots: SchedulerSlot[] = [];
        for (let day = 1; day <= 7; day++) {
          let cursor = 6 * 60 + Math.floor(random() * 8) * 15;
          for (let i = 0; i < 3 && cursor < 22 * 60; i++) {
            const length = (1 + Math.floor(random() * 12)) * 15;
            const end = Math.min(cursor + length, 1440);
            if (random() < 0.7)
              slots.push({ weekday: day, startMinute: cursor, endMinute: end });
            cursor = end + Math.floor(random() * 6) * 15;
          }
        }
        const tasks = Array.from(
          { length: 1 + Math.floor(random() * 25) },
          (_, i) =>
            task({
              id: `r${String(i).padStart(2, '0')}`,
              pendingMinutes: (1 + Math.floor(random() * 40)) * 5,
              priority: pick(['HIGH', 'MEDIUM', 'LOW'] as const),
              deadline:
                random() < 0.4
                  ? `2026-11-0${2 + Math.floor(random() * 6)}`
                  : null,
            }),
        );
        const result = generateSchedule(input({ slots, tasks }));

        // Disponibilidad = unión de franjas (las contiguas forman un único hueco).
        const slotRanges = slots
          .map((s) => ({
            start: at(s.weekday, '00:00').getTime() + s.startMinute * 60_000,
            end: at(s.weekday, '00:00').getTime() + s.endMinute * 60_000,
          }))
          .sort((x, y) => x.start - y.start)
          .reduce<{ start: number; end: number }[]>((acc, r) => {
            const last = acc[acc.length - 1];
            if (last && r.start <= last.end)
              last.end = Math.max(last.end, r.end);
            else acc.push({ ...r });
            return acc;
          }, []);
        const sorted = [...result.blocks].sort(
          (x, y) => x.startAt.getTime() - y.startAt.getTime(),
        );
        sorted.forEach((block, i) => {
          const minutes = minutesOf(block);
          expect(minutes).toBeGreaterThanOrEqual(5);
          expect(minutes).toBeLessThanOrEqual(50);
          expect(minutes % 5).toBe(0);
          expect(
            slotRanges.some(
              (r) =>
                block.startAt.getTime() >= r.start &&
                block.endAt.getTime() <= r.end,
            ),
          ).toBe(true);
          if (i > 0) {
            expect(block.startAt.getTime()).toBeGreaterThanOrEqual(
              sorted[i - 1].endAt.getTime() + 5 * 60_000,
            );
          }
          const owner = tasks.find((t) => t.id === block.taskId)!;
          if (owner.deadline) {
            expect(block.endAt.getTime()).toBeLessThanOrEqual(
              DateTime.fromISO(owner.deadline, { zone: TZ })
                .endOf('day')
                .toMillis() + 1,
            );
          }
        });
        for (const t of tasks) {
          const placed = result.blocks
            .filter((b) => b.taskId === t.id)
            .reduce((sum, b) => sum + minutesOf(b), 0);
          const missing =
            result.unassigned.find((u) => u.taskId === t.id)?.minutes ?? 0;
          expect(placed + missing).toBe(t.pendingMinutes);
        }
      });
    }
  });
});
