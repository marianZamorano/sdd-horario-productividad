import { generateSchedule } from './scheduler';
import type { SchedulerSlot, SchedulerTask } from './scheduler.types';

// SC-002: el algoritmo por sí solo debe tardar < 50 ms con 50 tareas (plan.md).
describe('generateSchedule performance', () => {
  it('genera una semana con 50 tareas y 14 franjas en menos de 50 ms', () => {
    const slots: SchedulerSlot[] = [];
    for (let weekday = 1; weekday <= 7; weekday++) {
      slots.push({ weekday, startMinute: 8 * 60, endMinute: 12 * 60 });
      slots.push({ weekday, startMinute: 17 * 60, endMinute: 22 * 60 });
    }
    const tasks: SchedulerTask[] = Array.from({ length: 50 }, (_, i) => ({
      id: `task-${String(i).padStart(2, '0')}`,
      pendingMinutes: 30 + (i % 8) * 15,
      priority: (['HIGH', 'MEDIUM', 'LOW'] as const)[i % 3],
      deadline: i % 4 === 0 ? `2026-11-0${2 + (i % 6)}` : null,
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)),
    }));
    const input = {
      now: new Date('2026-10-26T16:00:00.000Z'),
      timezone: 'America/La_Paz',
      weekStart: '2026-11-02',
      slots,
      tasks,
      keptBlocks: [],
    };

    generateSchedule(input); // calentamiento (carga de Luxon, JIT)
    const start = performance.now();
    const result = generateSchedule(input);
    const elapsed = performance.now() - start;

    expect(result.blocks.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
  });
});
