import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ScheduleBlockDto, UnassignedDto } from '../api/types';
import { UnassignedPanel } from './UnassignedPanel';
import { WeekGrid } from './WeekGrid';

function block(overrides: Partial<ScheduleBlockDto>): ScheduleBlockDto {
  return {
    id: 'b1',
    taskId: 't1',
    taskTitle: 'Tarea',
    taskCategory: null,
    taskPriority: 'MEDIUM',
    startAt: '2026-11-02T22:00:00.000Z',
    endAt: '2026-11-02T22:50:00.000Z',
    durationMinutes: 50,
    status: 'PLANNED',
    overdue: false,
    ...overrides,
  };
}

describe('WeekGrid (US4, FR-018)', () => {
  it('pinta 7 columnas de lunes a domingo con la fecha de cada día', () => {
    render(<WeekGrid weekStart="2026-11-02" timezone="America/La_Paz" blocks={[]} />);
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    for (const day of days) expect(screen.getByRole('region', { name: day })).toBeInTheDocument();
    expect(screen.getByText('2/11')).toBeInTheDocument();
    expect(screen.getByText('8/11')).toBeInTheDocument();
  });

  it('coloca cada bloque en su día y hora en la zona del usuario', () => {
    render(
      <WeekGrid
        weekStart="2026-11-02"
        timezone="America/La_Paz"
        blocks={[
          // 22:00Z = lunes 18:00 en La Paz (UTC-4)
          block({ id: 'a', taskTitle: 'Estudiar cálculo' }),
          // martes 03:30Z = lunes 23:30 local, sigue siendo lunes
          block({
            id: 'b',
            taskTitle: 'Leer',
            startAt: '2026-11-03T03:30:00.000Z',
            endAt: '2026-11-03T03:55:00.000Z',
            durationMinutes: 25,
          }),
          block({
            id: 'c',
            taskTitle: 'Gimnasio',
            startAt: '2026-11-07T13:00:00.000Z',
            endAt: '2026-11-07T13:45:00.000Z',
            durationMinutes: 45,
          }),
        ]}
      />,
    );
    const monday = screen.getByRole('region', { name: 'Lunes' });
    expect(within(monday).getByText('Estudiar cálculo')).toBeInTheDocument();
    expect(within(monday).getByText('18:00 – 18:50')).toBeInTheDocument();
    expect(within(monday).getByText('Leer')).toBeInTheDocument();
    expect(within(monday).getByText('23:30 – 23:55')).toBeInTheDocument();

    const saturday = screen.getByRole('region', { name: 'Sábado' });
    expect(within(saturday).getByText('Gimnasio')).toBeInTheDocument();
    expect(within(saturday).getByText('09:00 – 09:45')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Martes' })).queryByText('Leer')).toBeNull();
  });

  it('marca los bloques de tareas vencidas', () => {
    render(
      <WeekGrid
        weekStart="2026-11-02"
        timezone="America/La_Paz"
        blocks={[block({ taskTitle: 'Informe', overdue: true })]}
      />,
    );
    const card = screen.getByText('Informe').closest('article') as HTMLElement;
    expect(within(card).getByText('Vencida')).toBeInTheDocument();
  });

  it('muestra el estado del bloque (completado / omitido)', () => {
    render(
      <WeekGrid
        weekStart="2026-11-02"
        timezone="America/La_Paz"
        blocks={[
          block({ id: 'x', taskTitle: 'Hecho', status: 'COMPLETED' }),
          block({
            id: 'y',
            taskTitle: 'Saltado',
            status: 'SKIPPED',
            startAt: '2026-11-02T23:00:00.000Z',
            endAt: '2026-11-02T23:30:00.000Z',
          }),
        ]}
      />,
    );
    expect(
      within(screen.getByText('Hecho').closest('article') as HTMLElement).getByText('Completado'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByText('Saltado').closest('article') as HTMLElement).getByText('Omitido'),
    ).toBeInTheDocument();
  });
});

describe('UnassignedPanel (FR-015)', () => {
  it('lista minutos y motivo en español', () => {
    const items: UnassignedDto[] = [
      { taskId: 't1', taskTitle: 'Proyecto', minutes: 75, reason: 'NO_SPACE' },
      { taskId: 't2', taskTitle: 'Ensayo', minutes: 50, reason: 'NO_SPACE_BEFORE_DEADLINE' },
    ];
    render(<UnassignedPanel items={items} />);
    expect(screen.getByRole('heading', { name: 'Sin asignar (2)' })).toBeInTheDocument();
    expect(screen.getByText('Proyecto')).toBeInTheDocument();
    expect(screen.getByText('1 h 15 min · No hay espacio libre esta semana')).toBeInTheDocument();
    expect(screen.getByText('50 min · No hay espacio antes de su fecha límite')).toBeInTheDocument();
  });

  it('no se muestra si no hay tareas sin asignar', () => {
    const { container } = render(<UnassignedPanel items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
