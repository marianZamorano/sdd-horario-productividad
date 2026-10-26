import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWeek } from '../api/schedule';
import type { ScheduleBlockDto, WeekScheduleDto } from '../api/types';
import { BlockStatusActions } from './BlockStatusActions';
import { WeekGrid } from './WeekGrid';

const WEEK = '2026-11-02';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const baseBlock: ScheduleBlockDto = {
  id: 'b1',
  taskId: 't1',
  taskTitle: 'Estudiar cálculo',
  taskCategory: null,
  taskPriority: 'HIGH',
  startAt: '2026-11-02T22:00:00.000Z',
  endAt: '2026-11-02T22:50:00.000Z',
  durationMinutes: 50,
  status: 'PLANNED',
  overdue: false,
};

function Harness() {
  const { data } = useWeek(WEEK);
  if (!data) return <p>Cargando…</p>;
  return (
    <WeekGrid
      weekStart={WEEK}
      timezone={data.timezone}
      blocks={data.blocks}
      renderActions={(block) => <BlockStatusActions block={block} weekStart={WEEK} />}
    />
  );
}

function renderHarness() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <Harness />
    </QueryClientProvider>,
  );
}

const card = async () =>
  (await screen.findByText('Estudiar cálculo')).closest('article') as HTMLElement;

describe('Acciones de estado del bloque (US5, FR-019)', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let week: WeekScheduleDto;

  beforeEach(() => {
    week = { weekStart: WEEK, timezone: 'America/La_Paz', blocks: [baseBlock] };
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('un bloque planificado ofrece Completar y Omitir; al completar envía el PATCH', async () => {
    fetchMock.mockImplementation(async (_input, init) => {
      if ((init?.method ?? 'GET') === 'GET') return jsonResponse(200, week);
      const { status } = JSON.parse(String(init?.body)) as { status: string };
      return jsonResponse(200, {
        block: { ...baseBlock, status },
        task: { id: 't1', remainingMinutes: 0 },
      });
    });
    renderHarness();

    const article = await card();
    expect(within(article).getByRole('button', { name: 'Omitir' })).toBeInTheDocument();
    await userEvent.click(within(article).getByRole('button', { name: 'Completar' }));

    expect(await within(await card()).findByText('Completado')).toBeInTheDocument();
    expect(within(await card()).getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls.find(([, i]) => i?.method === 'PATCH')!;
    expect(String(url)).toMatch(/\/api\/schedule\/blocks\/b1$/);
    expect(JSON.parse(String(init?.body))).toEqual({ status: 'COMPLETED' });
  });

  it('deshacer devuelve un bloque completado a planificado', async () => {
    week.blocks = [{ ...baseBlock, status: 'COMPLETED' }];
    fetchMock.mockImplementation(async (_input, init) => {
      if ((init?.method ?? 'GET') === 'GET') return jsonResponse(200, week);
      return jsonResponse(200, { block: { ...baseBlock, status: 'PLANNED' }, task: {} });
    });
    renderHarness();

    await userEvent.click(within(await card()).getByRole('button', { name: 'Deshacer' }));
    expect(
      await within(await card()).findByRole('button', { name: 'Completar' }),
    ).toBeInTheDocument();
    expect(within(await card()).queryByText('Completado')).toBeNull();
  });

  it('actualiza al instante y revierte con un aviso si la API falla', async () => {
    let rejectPatch: (response: Response) => void = () => undefined;
    fetchMock.mockImplementation((_input, init) => {
      if ((init?.method ?? 'GET') === 'GET') return Promise.resolve(jsonResponse(200, week));
      return new Promise<Response>((resolve) => {
        rejectPatch = resolve;
      });
    });
    renderHarness();

    await userEvent.click(within(await card()).getByRole('button', { name: 'Omitir' }));
    // Optimista: ya se ve omitido antes de que responda el servidor.
    expect(await within(await card()).findByText('Omitido')).toBeInTheDocument();

    rejectPatch(jsonResponse(500, { statusCode: 500, message: 'Error interno del servidor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo actualizar el bloque');
    expect(within(await card()).queryByText('Omitido')).toBeNull();
    expect(within(await card()).getByRole('button', { name: 'Completar' })).toBeInTheDocument();
  });
});
