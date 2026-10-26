import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskDto } from '../api/types';
import { TasksPage } from './TasksPage';

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeTask(overrides: Partial<TaskDto>): TaskDto {
  return {
    id: 't1',
    title: 'Tarea',
    durationMinutes: 60,
    priority: 'MEDIUM',
    deadline: null,
    category: null,
    status: 'PENDING',
    completedAt: null,
    createdAt: '2026-10-20T00:00:00.000Z',
    completedMinutes: 0,
    remainingMinutes: 60,
    overdue: false,
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <TasksPage />
    </QueryClientProvider>,
  );
}

describe('TasksPage (US3)', () => {
  let tasks: TaskDto[];
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    tasks = [
      makeTask({
        id: 'over',
        title: 'Informe atrasado',
        priority: 'LOW',
        deadline: '2026-10-20',
        overdue: true,
      }),
      makeTask({
        id: 'calc',
        title: 'Estudiar cálculo',
        priority: 'HIGH',
        durationMinutes: 120,
        completedMinutes: 50,
        remainingMinutes: 70,
        category: 'Universidad',
      }),
    ];
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (method === 'GET') return jsonResponse(200, tasks);
      if (method === 'POST') {
        const body = JSON.parse(String(init?.body)) as Partial<TaskDto>;
        const created = makeTask({
          ...body,
          id: 'new',
          remainingMinutes: body.durationMinutes,
        });
        tasks = [...tasks, created];
        return jsonResponse(201, created);
      }
      const id = url.split('/').pop();
      if (method === 'PATCH') {
        const body = JSON.parse(String(init?.body)) as Partial<TaskDto>;
        tasks = tasks.map((t) => (t.id === id ? { ...t, ...body } : t));
        return jsonResponse(200, tasks.find((t) => t.id === id));
      }
      if (method === 'DELETE') {
        tasks = tasks.filter((t) => t.id !== id);
        return jsonResponse(204);
      }
      return jsonResponse(404, { statusCode: 404, message: 'No encontrado' });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  const itemOf = async (title: string) =>
    (await screen.findByText(title)).closest('li') as HTMLElement;

  it('muestra prioridad en español, minutos restantes, categoría y la marca de vencida', async () => {
    renderPage();
    const calc = await itemOf('Estudiar cálculo');
    expect(within(calc).getByText('Alta')).toBeInTheDocument();
    expect(within(calc).getByText('Quedan 1 h 10 min de 2 h')).toBeInTheDocument();
    expect(within(calc).getByText('Universidad')).toBeInTheDocument();

    const over = await itemOf('Informe atrasado');
    expect(within(over).getByText('Baja')).toBeInTheDocument();
    expect(within(over).getByText('Vencida')).toBeInTheDocument();
  });

  it('valida título y duración en español sin llamar a la API', async () => {
    renderPage();
    await screen.findByText('Estudiar cálculo');
    await userEvent.clear(screen.getByLabelText('Duración (min)'));
    await userEvent.type(screen.getByLabelText('Duración (min)'), '62');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir tarea' }));

    expect(screen.getByText('El título es obligatorio')).toBeInTheDocument();
    expect(
      screen.getByText('La duración debe ser un múltiplo de 5 entre 15 y 1440 minutos'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('crea una tarea con los campos del contrato', async () => {
    renderPage();
    await screen.findByText('Estudiar cálculo');
    await userEvent.type(screen.getByLabelText('Título'), 'Leer artículo');
    await userEvent.clear(screen.getByLabelText('Duración (min)'));
    await userEvent.type(screen.getByLabelText('Duración (min)'), '45');
    await userEvent.selectOptions(screen.getByLabelText('Prioridad'), 'HIGH');
    await userEvent.type(screen.getByLabelText('Fecha límite'), '2026-10-30');
    await userEvent.type(screen.getByLabelText('Categoría'), 'Lecturas');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir tarea' }));

    expect(await screen.findByText('Leer artículo')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      title: 'Leer artículo',
      durationMinutes: 45,
      priority: 'HIGH',
      deadline: '2026-10-30',
      category: 'Lecturas',
    });
  });

  it('marca una tarea como terminada', async () => {
    renderPage();
    const calc = await itemOf('Estudiar cálculo');
    await userEvent.click(within(calc).getByRole('button', { name: 'Terminar' }));

    expect(
      await within(await itemOf('Estudiar cálculo')).findByRole('button', { name: 'Reabrir' }),
    ).toBeInTheDocument();
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ status: 'DONE' });
  });

  it('pide confirmación antes de borrar y no borra si se cancela', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
    renderPage();
    const over = await itemOf('Informe atrasado');
    await userEvent.click(within(over).getByRole('button', { name: 'Eliminar' }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

    confirmSpy.mockReturnValueOnce(true);
    await userEvent.click(within(over).getByRole('button', { name: 'Eliminar' }));
    await vi.waitFor(() => expect(screen.queryByText('Informe atrasado')).toBeNull());
  });
});
