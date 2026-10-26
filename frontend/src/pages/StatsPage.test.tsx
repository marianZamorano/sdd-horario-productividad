import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeekStatsDto } from '../api/types';
import { StatsPage } from './StatsPage';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <StatsPage />
    </QueryClientProvider>,
  );
}

describe('StatsPage (US6)', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let stats: WeekStatsDto;

  beforeEach(() => {
    stats = {
      weekStart: '2026-11-02',
      totalBlocks: 10,
      completedBlocks: 6,
      skippedBlocks: 2,
      completionRate: 60,
      plannedMinutes: 480,
      completedMinutes: 300,
      tasksCompleted: 2,
      streakDays: 3,
    };
    fetchMock.mockImplementation(async () => jsonResponse(200, stats));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('muestra las cuatro métricas con formato en español', async () => {
    renderPage();
    expect(await screen.findByText('60 %')).toBeInTheDocument();
    expect(screen.getByText('6 de 10 bloques completados')).toBeInTheDocument();
    expect(screen.getByText('5 h / 8 h')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3 días')).toBeInTheDocument();
    for (const title of [
      'Bloques completados',
      'Horas completadas / planificadas',
      'Tareas terminadas',
      'Racha actual',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('pide las métricas de la semana actual (lunes)', async () => {
    renderPage();
    await screen.findByText('60 %');
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/api\/stats\/week\?weekStart=\d{4}-\d{2}-\d{2}$/,
    );
  });

  it('en una semana vacía invita a generar el horario', async () => {
    stats = {
      ...stats,
      totalBlocks: 0,
      completedBlocks: 0,
      skippedBlocks: 0,
      completionRate: 0,
      plannedMinutes: 0,
      completedMinutes: 0,
      tasksCompleted: 0,
      streakDays: 1,
    };
    renderPage();
    expect(
      await screen.findByText('Aún no hay bloques esta semana. Genera tu horario en "Semana".'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 día')).toBeInTheDocument();
  });
});
