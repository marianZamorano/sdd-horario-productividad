import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { createTestApp, registerUser, resetDatabase } from './utils';

// contracts/availability.md · US2 · FR-003, FR-004, FR-005
describe('Availability (e2e)', () => {
  let app: INestApplication<App>;
  let tokenA: string;
  let tokenB: string;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const createSlot = (token: string, body: object) =>
    http().post('/api/availability').set(auth(token)).send(body);

  /** Crea "lunes 18:00–22:00" y devuelve su id. */
  const createMondaySlot = async (token: string): Promise<string> => {
    const res = await createSlot(token, {
      weekday: 1,
      startMinute: 1080,
      endMinute: 1320,
    }).expect(201);
    return (res.body as { id: string }).id;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    ({ token: tokenA } = await registerUser(app, 'ana@example.com'));
    ({ token: tokenB } = await registerUser(app, 'beto@example.com'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('crea una franja (201) con la forma del contrato', async () => {
    const res = await createSlot(tokenA, {
      weekday: 1,
      startMinute: 1080,
      endMinute: 1320,
    }).expect(201);
    const { id, ...rest } = res.body as Record<string, unknown>;
    expect(typeof id).toBe('string');
    expect(rest).toEqual({ weekday: 1, startMinute: 1080, endMinute: 1320 });
  });

  it('lista las franjas propias ordenadas por día y hora de inicio', async () => {
    await createSlot(tokenA, { weekday: 6, startMinute: 540, endMinute: 780 });
    await createSlot(tokenA, {
      weekday: 1,
      startMinute: 1080,
      endMinute: 1320,
    });
    await createSlot(tokenA, { weekday: 1, startMinute: 420, endMinute: 480 });
    await createSlot(tokenB, { weekday: 2, startMinute: 600, endMinute: 660 });

    const res = await http()
      .get('/api/availability')
      .set(auth(tokenA))
      .expect(200);
    const slots = res.body as { weekday: number; startMinute: number }[];
    expect(slots.map((s) => [s.weekday, s.startMinute])).toEqual([
      [1, 420],
      [1, 1080],
      [6, 540],
    ]);
  });

  it.each([
    [
      { weekday: 1, startMinute: 1320, endMinute: 1080 },
      'fin antes del inicio',
    ],
    [{ weekday: 1, startMinute: 600, endMinute: 600 }, 'fin igual al inicio'],
    [{ weekday: 1, startMinute: 605, endMinute: 660 }, 'no múltiplo de 15'],
    [{ weekday: 8, startMinute: 600, endMinute: 660 }, 'día fuera de rango'],
    [{ weekday: 1, startMinute: 1380, endMinute: 1455 }, 'cruza la medianoche'],
    [{ weekday: 1, startMinute: 600 }, 'falta endMinute'],
  ])('rechaza con 400: %j (%s)', async (body) => {
    await createSlot(tokenA, body).expect(400);
  });

  it('rechaza una franja solapada del mismo día con 409 SLOT_OVERLAP', async () => {
    await createSlot(tokenA, {
      weekday: 1,
      startMinute: 1080,
      endMinute: 1320,
    });
    const res = await createSlot(tokenA, {
      weekday: 1,
      startMinute: 1260,
      endMinute: 1380,
    }).expect(409);
    expect(res.body).toMatchObject({ code: 'SLOT_OVERLAP' });
  });

  it('permite franjas contiguas, en otro día o de otro usuario', async () => {
    await createSlot(tokenA, {
      weekday: 1,
      startMinute: 1080,
      endMinute: 1320,
    });
    await createSlot(tokenA, {
      weekday: 1,
      startMinute: 1320,
      endMinute: 1380,
    }).expect(201);
    await createSlot(tokenA, {
      weekday: 2,
      startMinute: 1080,
      endMinute: 1320,
    }).expect(201);
    await createSlot(tokenB, {
      weekday: 1,
      startMinute: 1080,
      endMinute: 1320,
    }).expect(201);
  });

  it('PATCH actualiza y excluye la propia franja de la validación de solape', async () => {
    const id = await createMondaySlot(tokenA);

    const res = await http()
      .patch(`/api/availability/${id}`)
      .set(auth(tokenA))
      .send({ startMinute: 1020 })
      .expect(200);
    expect(res.body).toMatchObject({ startMinute: 1020, endMinute: 1320 });
  });

  it('PATCH rechaza solapes con otra franja y rangos inválidos combinados', async () => {
    await createSlot(tokenA, { weekday: 1, startMinute: 600, endMinute: 720 });
    const id = await createMondaySlot(tokenA);

    await http()
      .patch(`/api/availability/${id}`)
      .set(auth(tokenA))
      .send({ startMinute: 660 })
      .expect(409);
    await http()
      .patch(`/api/availability/${id}`)
      .set(auth(tokenA))
      .send({ endMinute: 1020 })
      .expect(400);
  });

  it('DELETE borra (204) y la franja deja de aparecer', async () => {
    const id = await createMondaySlot(tokenA);
    await http()
      .delete(`/api/availability/${id}`)
      .set(auth(tokenA))
      .expect(204);
    const res = await http().get('/api/availability').set(auth(tokenA));
    expect(res.body).toEqual([]);
  });

  it('responde 401 sin token', async () => {
    await http().get('/api/availability').expect(401);
    await http()
      .post('/api/availability')
      .send({ weekday: 1, startMinute: 600, endMinute: 660 })
      .expect(401);
  });

  it('las franjas de A son inexistentes para B (404) y no aparecen en su lista', async () => {
    const id = await createMondaySlot(tokenA);

    await http()
      .patch(`/api/availability/${id}`)
      .set(auth(tokenB))
      .send({ startMinute: 1020 })
      .expect(404);
    await http()
      .delete(`/api/availability/${id}`)
      .set(auth(tokenB))
      .expect(404);
    const listB = await http().get('/api/availability').set(auth(tokenB));
    expect(listB.body).toEqual([]);
  });

  it('un id con formato inválido responde 404', async () => {
    await http()
      .delete('/api/availability/no-es-uuid')
      .set(auth(tokenA))
      .expect(404);
  });
});
