import { INestApplication } from '@nestjs/common';
import { DateTime } from 'luxon';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser, resetDatabase } from './utils';

// contracts/stats.md · US6 · FR-003, FR-020 a FR-022
const TZ = 'America/La_Paz';

describe('Stats (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenA: string;
  let userA: string;
  let tokenB: string;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const today = DateTime.now().setZone(TZ).startOf('day');
  const monday = today.startOf('week');
  const WEEK = monday.toISODate()!;

  const createTask = async (title: string, minutes: number) =>
    prisma.task.create({
      data: {
        userId: userA,
        title,
        durationMinutes: minutes,
        priority: 'HIGH',
      },
    });

  const seedBlock = (
    taskId: string,
    start: DateTime,
    minutes: number,
    status: 'PLANNED' | 'COMPLETED' | 'SKIPPED',
  ) =>
    prisma.scheduleBlock.create({
      data: {
        userId: userA,
        taskId,
        startAt: start.toJSDate(),
        endAt: start.plus({ minutes }).toJSDate(),
        status,
      },
    });

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

  it('calcula las métricas de la semana con bloques y tareas reales', async () => {
    const task = await createTask('Estudiar', 200);
    const at = (hour: number) => monday.set({ hour });
    await seedBlock(task.id, at(8), 50, 'COMPLETED');
    await seedBlock(task.id, at(9), 50, 'COMPLETED');
    await seedBlock(task.id, at(10), 50, 'SKIPPED');
    await seedBlock(task.id, at(11), 30, 'PLANNED');
    // Fuera de la semana: no cuenta en totales.
    await seedBlock(
      task.id,
      monday.minus({ days: 3 }).set({ hour: 8 }),
      50,
      'COMPLETED',
    );

    const done = await createTask('Terminada', 30);
    await prisma.task.update({
      where: { id: done.id },
      data: {
        status: 'DONE',
        completedAt: monday.plus({ hours: 12 }).toJSDate(),
      },
    });
    const doneBefore = await createTask('Terminada antes', 30);
    await prisma.task.update({
      where: { id: doneBefore.id },
      data: {
        status: 'DONE',
        completedAt: monday.minus({ days: 1 }).toJSDate(),
      },
    });

    const res = await http()
      .get(`/api/stats/week?weekStart=${WEEK}`)
      .set(auth(tokenA))
      .expect(200);
    expect(res.body).toMatchObject({
      weekStart: WEEK,
      totalBlocks: 4,
      completedBlocks: 2,
      skippedBlocks: 1,
      completionRate: 50,
      plannedMinutes: 180,
      completedMinutes: 100,
      tasksCompleted: 1,
    });
  });

  it('la racha cuenta los días con bloques completados hasta hoy', async () => {
    const task = await createTask('Hábito', 500);
    for (const daysAgo of [0, 1, 2]) {
      await seedBlock(
        task.id,
        today.minus({ days: daysAgo }).set({ hour: 7 }),
        25,
        'COMPLETED',
      );
    }
    await seedBlock(
      task.id,
      today.minus({ days: 4 }).set({ hour: 7 }),
      25,
      'COMPLETED',
    );

    const res = await http()
      .get(`/api/stats/week?weekStart=${WEEK}`)
      .set(auth(tokenA))
      .expect(200);
    expect((res.body as { streakDays: number }).streakDays).toBe(3);
  });

  it('una semana sin bloques devuelve ceros', async () => {
    const res = await http()
      .get(`/api/stats/week?weekStart=${WEEK}`)
      .set(auth(tokenA))
      .expect(200);
    expect(res.body).toEqual({
      weekStart: WEEK,
      totalBlocks: 0,
      completedBlocks: 0,
      skippedBlocks: 0,
      completionRate: 0,
      plannedMinutes: 0,
      completedMinutes: 0,
      tasksCompleted: 0,
      streakDays: 0,
    });
  });

  it('rechaza weekStart que no es lunes (400) y exige token (401)', async () => {
    const tuesday = monday.plus({ days: 1 }).toISODate();
    await http()
      .get(`/api/stats/week?weekStart=${tuesday}`)
      .set(auth(tokenA))
      .expect(400);
    await http().get('/api/stats/week').set(auth(tokenA)).expect(400);
    await http().get(`/api/stats/week?weekStart=${WEEK}`).expect(401);
  });

  it('las métricas de B ignoran los datos de A', async () => {
    const task = await createTask('De Ana', 100);
    await seedBlock(task.id, today.set({ hour: 7 }), 50, 'COMPLETED');
    const res = await http()
      .get(`/api/stats/week?weekStart=${WEEK}`)
      .set(auth(tokenB))
      .expect(200);
    expect(res.body).toMatchObject({
      totalBlocks: 0,
      completedMinutes: 0,
      streakDays: 0,
    });
  });
});
