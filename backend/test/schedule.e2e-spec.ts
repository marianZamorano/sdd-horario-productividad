import { INestApplication } from '@nestjs/common';
import { DateTime } from 'luxon';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser, resetDatabase } from './utils';

// contracts/schedule.md · US4 · FR-010 a FR-018
const TZ = 'America/La_Paz'; // zona por defecto de registerUser()

interface BlockBody {
  id: string;
  taskId: string;
  taskTitle: string;
  taskPriority: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: string;
  overdue: boolean;
}

interface GenerateBody {
  weekStart: string;
  timezone: string;
  blocks: BlockBody[];
  unassigned: {
    taskId: string;
    taskTitle: string;
    minutes: number;
    reason: string;
  }[];
  createdBlocks: number;
  hasAvailability: boolean;
  hasPendingTasks: boolean;
}

describe('Schedule (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenA: string;
  let userA: string;
  let tokenB: string;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  // Semana siguiente: siempre en el futuro, así ningún bloque cae en el pasado.
  const nextMonday = DateTime.now()
    .setZone(TZ)
    .startOf('week')
    .plus({ weeks: 1 });
  const WEEK = nextMonday.toISODate()!;
  const localTime = (iso: string) =>
    DateTime.fromISO(iso, { zone: TZ }).toFormat('ccc HH:mm', {
      locale: 'en',
    });

  const addSlot = (token: string, weekday: number, from: number, to: number) =>
    http()
      .post('/api/availability')
      .set(auth(token))
      .send({ weekday, startMinute: from, endMinute: to })
      .expect(201);

  const addTask = async (token: string, body: object): Promise<string> => {
    const res = await http()
      .post('/api/tasks')
      .set(auth(token))
      .send(body)
      .expect(201);
    return (res.body as { id: string }).id;
  };

  const generate = async (token: string, weekStart = WEEK) => {
    const res = await http()
      .post('/api/schedule/generate')
      .set(auth(token))
      .send({ weekStart })
      .expect(200);
    return res.body as GenerateBody;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    ({ token: tokenA, userId: userA } = await registerUser(
      app,
      'ana@example.com',
    ));
    ({ token: tokenB } = await registerUser(app, 'beto@example.com'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza un weekStart que no es lunes o mal formado (400)', async () => {
    const tuesday = nextMonday.plus({ days: 1 }).toISODate();
    await http()
      .post('/api/schedule/generate')
      .set(auth(tokenA))
      .send({ weekStart: tuesday })
      .expect(400);
    await http()
      .post('/api/schedule/generate')
      .set(auth(tokenA))
      .send({})
      .expect(400);
    await http()
      .get(`/api/schedule?weekStart=${tuesday}`)
      .set(auth(tokenA))
      .expect(400);
    await http().get('/api/schedule').set(auth(tokenA)).expect(400);
  });

  it('genera la semana (escenario 1) con datos de la tarea y la respuesta del contrato', async () => {
    await addSlot(tokenA, 1, 1080, 1200); // lun 18:00-20:00
    const low = await addTask(tokenA, {
      title: 'Baja',
      durationMinutes: 50,
      priority: 'LOW',
    });
    const high = await addTask(tokenA, {
      title: 'Alta',
      durationMinutes: 50,
      priority: 'HIGH',
    });

    const body = await generate(tokenA);
    expect(body).toMatchObject({
      weekStart: WEEK,
      timezone: TZ,
      createdBlocks: 2,
      hasAvailability: true,
      hasPendingTasks: true,
      unassigned: [],
    });
    expect(
      body.blocks.map((b) => [
        b.taskId,
        localTime(b.startAt),
        localTime(b.endAt),
      ]),
    ).toEqual([
      [high, 'Mon 18:00', 'Mon 18:50'],
      [low, 'Mon 18:55', 'Mon 19:45'],
    ]);
    expect(body.blocks[0]).toMatchObject({
      taskTitle: 'Alta',
      taskPriority: 'HIGH',
      durationMinutes: 50,
      status: 'PLANNED',
      overdue: false,
    });

    const week = await http()
      .get(`/api/schedule?weekStart=${WEEK}`)
      .set(auth(tokenA))
      .expect(200);
    expect((week.body as GenerateBody).blocks.map((b) => b.id)).toEqual(
      body.blocks.map((b) => b.id),
    );
  });

  it('informa lo que no cabe y los flags de semana vacía', async () => {
    const taskId = await addTask(tokenA, {
      title: 'Sin hueco',
      durationMinutes: 60,
      priority: 'HIGH',
    });
    const noSlots = await generate(tokenA);
    expect(noSlots).toMatchObject({
      createdBlocks: 0,
      hasAvailability: false,
      hasPendingTasks: true,
      unassigned: [
        { taskId, taskTitle: 'Sin hueco', minutes: 60, reason: 'NO_SPACE' },
      ],
    });

    const noTasks = await generate(tokenB);
    expect(noTasks).toMatchObject({
      createdBlocks: 0,
      hasPendingTasks: false,
      blocks: [],
      unassigned: [],
    });
  });

  it('regenerar conserva COMPLETED/SKIPPED y reemplaza solo los PLANNED (FR-016)', async () => {
    await addSlot(tokenA, 1, 1080, 1320); // lun 18:00-22:00
    await addTask(tokenA, {
      title: 'Larga',
      durationMinutes: 150,
      priority: 'HIGH',
    });
    const first = await generate(tokenA);
    expect(first.blocks).toHaveLength(3);

    const [done, skipped, planned] = first.blocks;
    await prisma.scheduleBlock.update({
      where: { id: done.id },
      data: { status: 'COMPLETED' },
    });
    await prisma.scheduleBlock.update({
      where: { id: skipped.id },
      data: { status: 'SKIPPED' },
    });

    const second = await generate(tokenA);
    const ids = second.blocks.map((b) => b.id);
    expect(ids).toContain(done.id);
    expect(ids).toContain(skipped.id);
    expect(ids).not.toContain(planned.id);

    // 150 − 50 completados = 100 pendientes → bloques nuevos sin solapar los conservados.
    const sorted = [...second.blocks].sort((a, b) =>
      a.startAt.localeCompare(b.startAt),
    );
    for (let i = 1; i < sorted.length; i++) {
      expect(Date.parse(sorted[i].startAt)).toBeGreaterThanOrEqual(
        Date.parse(sorted[i - 1].endAt) + 5 * 60_000,
      );
    }
    const newMinutes = second.blocks
      .filter((b) => b.status === 'PLANNED')
      .reduce((sum, b) => sum + b.durationMinutes, 0);
    expect(newMinutes).toBe(100);
  });

  it('descuenta los minutos ya planificados en otras semanas', async () => {
    await addSlot(tokenA, 2, 1080, 1320); // mar 18:00-22:00
    const taskId = await addTask(tokenA, {
      title: 'Repartida',
      durationMinutes: 100,
      priority: 'MEDIUM',
    });
    const otherWeek = nextMonday.plus({ weeks: 1, days: 1, hours: 18 });
    await prisma.scheduleBlock.create({
      data: {
        userId: userA,
        taskId,
        startAt: otherWeek.toJSDate(),
        endAt: otherWeek.plus({ minutes: 50 }).toJSDate(),
      },
    });

    const body = await generate(tokenA);
    expect(body.blocks.reduce((sum, b) => sum + b.durationMinutes, 0)).toBe(50);
  });

  it('dos generaciones simultáneas no duplican ni solapan bloques', async () => {
    await addSlot(tokenA, 1, 1080, 1320);
    await addTask(tokenA, {
      title: 'A',
      durationMinutes: 100,
      priority: 'HIGH',
    });
    await Promise.all([generate(tokenA), generate(tokenA), generate(tokenA)]);
    const count = await prisma.scheduleBlock.count({
      where: { userId: userA },
    });
    expect(count).toBe(2);
  });

  it('responde 401 sin token', async () => {
    await http().get(`/api/schedule?weekStart=${WEEK}`).expect(401);
    await http()
      .post('/api/schedule/generate')
      .send({ weekStart: WEEK })
      .expect(401);
  });

  it('B nunca ve ni modifica los bloques de A', async () => {
    await addSlot(tokenA, 1, 1080, 1200);
    await addTask(tokenA, {
      title: 'De Ana',
      durationMinutes: 50,
      priority: 'HIGH',
    });
    const a = await generate(tokenA);

    await addSlot(tokenB, 1, 1080, 1200);
    await generate(tokenB);
    const weekB = await http()
      .get(`/api/schedule?weekStart=${WEEK}`)
      .set(auth(tokenB))
      .expect(200);
    expect((weekB.body as GenerateBody).blocks).toEqual([]);

    const weekA = await http()
      .get(`/api/schedule?weekStart=${WEEK}`)
      .set(auth(tokenA))
      .expect(200);
    expect((weekA.body as GenerateBody).blocks.map((b) => b.id)).toEqual(
      a.blocks.map((b) => b.id),
    );
  });
});
