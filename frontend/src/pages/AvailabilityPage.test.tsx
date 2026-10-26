import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AvailabilitySlotDto } from '../api/types';
import { AvailabilityPage } from './AvailabilityPage';

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AvailabilityPage />
    </QueryClientProvider>,
  );
}

describe('AvailabilityPage (US2)', () => {
  let slots: AvailabilitySlotDto[];
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    slots = [
      { id: 's2', weekday: 6, startMinute: 540, endMinute: 780 },
      { id: 's1', weekday: 1, startMinute: 1080, endMinute: 1320 },
    ];
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.endsWith('/api/availability')) {
        return jsonResponse(200, slots);
      }
      if (method === 'POST') {
        const body = JSON.parse(String(init?.body)) as Omit<AvailabilitySlotDto, 'id'>;
        if (body.weekday === 1 && body.startMinute < 1320 && body.endMinute > 1080) {
          return jsonResponse(409, {
            statusCode: 409,
            message: 'La franja se solapa con otra existente',
            code: 'SLOT_OVERLAP',
          });
        }
        const created = { id: 'new', ...body };
        slots = [...slots, created];
        return jsonResponse(201, created);
      }
      if (method === 'DELETE') {
        slots = slots.filter((slot) => !url.endsWith(`/${slot.id}`));
        return jsonResponse(204);
      }
      return jsonResponse(404, { statusCode: 404, message: 'No encontrado' });
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('muestra las franjas agrupadas por día y en formato HH:mm', async () => {
    renderPage();
    const monday = await screen.findByRole('region', { name: 'Lunes' });
    expect(within(monday).getByText('18:00 – 22:00')).toBeInTheDocument();
    const saturday = screen.getByRole('region', { name: 'Sábado' });
    expect(within(saturday).getByText('09:00 – 13:00')).toBeInTheDocument();
  });

  it('convierte HH:mm a minutos al crear una franja', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'Lunes' });

    await userEvent.selectOptions(screen.getByLabelText('Día'), '3');
    await userEvent.clear(screen.getByLabelText('Desde'));
    await userEvent.type(screen.getByLabelText('Desde'), '07:30');
    await userEvent.clear(screen.getByLabelText('Hasta'));
    await userEvent.type(screen.getByLabelText('Hasta'), '09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir franja' }));

    const wednesday = await screen.findByRole('region', { name: 'Miércoles' });
    expect(within(wednesday).getByText('07:30 – 09:00')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      weekday: 3,
      startMinute: 450,
      endMinute: 540,
    });
  });

  it('valida en el cliente que la hora de fin sea posterior al inicio', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'Lunes' });

    await userEvent.clear(screen.getByLabelText('Desde'));
    await userEvent.type(screen.getByLabelText('Desde'), '10:00');
    await userEvent.clear(screen.getByLabelText('Hasta'));
    await userEvent.type(screen.getByLabelText('Hasta'), '09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir franja' }));

    expect(
      screen.getByText('La hora de fin debe ser posterior a la de inicio'),
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('muestra el error de solape que devuelve la API', async () => {
    renderPage();
    await screen.findByRole('region', { name: 'Lunes' });

    await userEvent.selectOptions(screen.getByLabelText('Día'), '1');
    await userEvent.clear(screen.getByLabelText('Desde'));
    await userEvent.type(screen.getByLabelText('Desde'), '21:00');
    await userEvent.clear(screen.getByLabelText('Hasta'));
    await userEvent.type(screen.getByLabelText('Hasta'), '23:00');
    await userEvent.click(screen.getByRole('button', { name: 'Añadir franja' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La franja se solapa con otra existente',
    );
  });

  it('borra una franja', async () => {
    renderPage();
    const saturday = await screen.findByRole('region', { name: 'Sábado' });
    await userEvent.click(within(saturday).getByRole('button', { name: 'Eliminar' }));

    expect(await within(saturday).findByText('Sin franjas')).toBeInTheDocument();
    expect(screen.queryByText('09:00 – 13:00')).not.toBeInTheDocument();
  });
});
