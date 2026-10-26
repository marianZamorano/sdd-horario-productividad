import {
  compareTasks,
  isOverdue,
  remainingMinutes,
  type OrderableTask,
} from './task-rules';

const TZ = 'America/La_Paz'; // UTC-4
// Lunes 2026-10-26 12:00 en La Paz
const NOW = new Date('2026-10-26T16:00:00.000Z');

function task(
  overrides: Partial<OrderableTask> & { id: string },
): OrderableTask {
  return {
    priority: 'MEDIUM',
    deadline: null,
    createdAt: new Date('2026-10-20T00:00:00.000Z'),
    status: 'PENDING',
    ...overrides,
  };
}

describe('task rules (FR-007, FR-011)', () => {
  describe('isOverdue', () => {
    it('es vencida si sigue pendiente y su fecha límite terminó (zona del usuario)', () => {
      expect(
        isOverdue(task({ id: 'a', deadline: '2026-10-25' }), NOW, TZ),
      ).toBe(true);
    });

    it('no es vencida el mismo día de la fecha límite (vence a las 23:59:59 local)', () => {
      expect(
        isOverdue(task({ id: 'a', deadline: '2026-10-26' }), NOW, TZ),
      ).toBe(false);
      const lastMinute = new Date('2026-10-27T03:59:00.000Z'); // 23:59 local
      expect(
        isOverdue(task({ id: 'a', deadline: '2026-10-26' }), lastMinute, TZ),
      ).toBe(false);
    });

    it('nunca es vencida sin fecha límite o si ya está terminada', () => {
      expect(isOverdue(task({ id: 'a' }), NOW, TZ)).toBe(false);
      expect(
        isOverdue(
          task({ id: 'a', deadline: '2026-10-01', status: 'DONE' }),
          NOW,
          TZ,
        ),
      ).toBe(false);
    });
  });

  describe('compareTasks', () => {
    const sortIds = (tasks: OrderableTask[]) =>
      [...tasks].sort(compareTasks(NOW, TZ)).map((t) => t.id);

    it('vencidas primero, aunque tengan prioridad baja', () => {
      expect(
        sortIds([
          task({ id: 'high', priority: 'HIGH' }),
          task({ id: 'overdue-low', priority: 'LOW', deadline: '2026-10-20' }),
        ]),
      ).toEqual(['overdue-low', 'high']);
    });

    it('después por prioridad: alta > media > baja', () => {
      expect(
        sortIds([
          task({ id: 'low', priority: 'LOW' }),
          task({ id: 'high', priority: 'HIGH' }),
          task({ id: 'medium', priority: 'MEDIUM' }),
        ]),
      ).toEqual(['high', 'medium', 'low']);
    });

    it('a igual prioridad, fecha límite más cercana primero y sin fecha al final', () => {
      expect(
        sortIds([
          task({ id: 'none' }),
          task({ id: 'fri', deadline: '2026-10-30' }),
          task({ id: 'wed', deadline: '2026-10-28' }),
        ]),
      ).toEqual(['wed', 'fri', 'none']);
    });

    it('después por fecha de creación más antigua y por último por id (determinista)', () => {
      const created = new Date('2026-10-21T00:00:00.000Z');
      expect(
        sortIds([
          task({ id: 'b', createdAt: created }),
          task({
            id: 'newer',
            createdAt: new Date('2026-10-22T00:00:00.000Z'),
          }),
          task({ id: 'a', createdAt: created }),
        ]),
      ).toEqual(['a', 'b', 'newer']);
    });

    it('las vencidas se ordenan entre sí con los mismos criterios', () => {
      expect(
        sortIds([
          task({ id: 'ov-low', priority: 'LOW', deadline: '2026-10-10' }),
          task({
            id: 'ov-high-late',
            priority: 'HIGH',
            deadline: '2026-10-24',
          }),
          task({
            id: 'ov-high-early',
            priority: 'HIGH',
            deadline: '2026-10-22',
          }),
        ]),
      ).toEqual(['ov-high-early', 'ov-high-late', 'ov-low']);
    });
  });

  describe('remainingMinutes', () => {
    it('es la duración menos lo completado, nunca negativa', () => {
      expect(remainingMinutes(120, 0)).toBe(120);
      expect(remainingMinutes(120, 50)).toBe(70);
      expect(remainingMinutes(60, 90)).toBe(0);
    });
  });
});
