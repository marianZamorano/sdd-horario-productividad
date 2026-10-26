import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser, resetDatabase } from './utils';

// contracts/tasks.md · US3 · FR-003, FR-006 a FR-009
describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenA: string;
  let userA: string;
  let tokenB: string;
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  interface TaskBody {
    id: string;
    title: string;
    status: string;
    completedAt: string | null;
    completedMinutes: number;
    remainingMinutes: number;
    overdue: boolean;
    deadline: string | null;
    category: string | null;
  }

  const createTask = async (token: string, body: object): Promise<TaskBody> => {
    const res = await http()
      .post('/api/tasks')
      .set(auth(token))
      .send(body)
      .expect(201);
    return res.body as TaskBody;
  };

  const listTasks = async (token: string, query = ''): Promise<TaskBody[]> => {
    const res = await http()
      .get(`/api/tasks${query}`)
      .set(auth(token))
      .expect(200);
    return res.body as TaskBody[];
  };

  const seedBlock = (
    taskId: string,
    startAt: string,
    minutes: number,
    status: 'PLANNED' | 'COMPLETED' | 'SKIPPED',
  ) =>
    prisma.scheduleBlock.create({
      data: {
        userId: userA,
        taskId,
        startAt: new Date(startAt),
        endAt: new Date(new Date(startAt).getTime() + minutes * 60_000),
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

  it('crea una tarea (201) con campos derivados', async () => {
    const task = await createTask(tokenA, {
      title: '  Estudiar cálculo ',
      durationMinutes: 120,
      priority: 'HIGH',
      deadline: '2099-10-30',
      category: 'Universidad',
    });
    expect(task).toMatchObject({
      title: 'Estudiar cálculo',
      status: 'PENDING',
      deadline: '2099-10-30',
      category: 'Universidad',
      completedAt: null,
      completedMinutes: 0,
      remainingMinutes: 120,
      overdue: false,
    });
  });

  it('una categoría vacía se guarda como null y una fecha pasada marca overdue', async () => {
    const task = await createTask(tokenA, {
      title: 'Atrasada',
      durationMinutes: 30,
      priority: 'LOW',
      deadline: '2020-01-01',
      category: '   ',
    });
    expect(task.category).toBeNull();
    expect(task.overdue).toBe(true);
  });

  it.each([
    [{ durationMinutes: 60, priority: 'HIGH' }, 'sin título'],
    [{ title: '', durationMinutes: 60, priority: 'HIGH' }, 'título vacío'],
    [
      { title: 'x'.repeat(121), durationMinutes: 60, priority: 'HIGH' },
      'título largo',
    ],
    [{ title: 'T', durationMinutes: 10, priority: 'HIGH' }, 'duración < 15'],
    [
      { title: 'T', durationMinutes: 1445, priority: 'HIGH' },
      'duración > 1440',
    ],
    [{ title: 'T', durationMinutes: 62, priority: 'HIGH' }, 'no múltiplo de 5'],
    [
      { title: 'T', durationMinutes: 60, priority: 'URGENT' },
      'prioridad inválida',
    ],
    [
      {
        title: 'T',
        durationMinutes: 60,
        priority: 'HIGH',
        deadline: '30/10/2026',
      },
      'fecha mal formada',
    ],
    [
      {
        title: 'T',
        durationMinutes: 60,
        priority: 'HIGH',
        category: 'c'.repeat(41),
      },
      'categoría larga',
    ],
    [
      { title: 'T', durationMinutes: 60, priority: 'HIGH', status: 'DONE' },
      'status al crear',
    ],
  ])('rechaza con 400: %j (%s)', async (body) => {
    await http().post('/api/tasks').set(auth(tokenA)).send(body).expect(400);
  });

  it('lista en el orden del generador y filtra por status', async () => {
    await createTask(tokenA, {
      title: 'baja',
      durationMinutes: 30,
      priority: 'LOW',
    });
    await createTask(tokenA, {
      title: 'vencida',
      durationMinutes: 30,
      priority: 'LOW',
      deadline: '2020-01-01',
    });
    await createTask(tokenA, {
      title: 'alta',
      durationMinutes: 30,
      priority: 'HIGH',
    });
    await createTask(tokenB, {
      title: 'de beto',
      durationMinutes: 30,
      priority: 'HIGH',
    });

    expect((await listTasks(tokenA)).map((t) => t.title)).toEqual([
      'vencida',
      'alta',
      'baja',
    ]);

    const alta = (await listTasks(tokenA)).find((t) => t.title === 'alta')!;
    await http()
      .patch(`/api/tasks/${alta.id}`)
      .set(auth(tokenA))
      .send({ status: 'DONE' })
      .expect(200);
    expect(
      (await listTasks(tokenA, '?status=DONE')).map((t) => t.title),
    ).toEqual(['alta']);
    expect(
      (await listTasks(tokenA, '?status=PENDING')).map((t) => t.title),
    ).toEqual(['vencida', 'baja']);
    await http().get('/api/tasks?status=OTRO').set(auth(tokenA)).expect(400);
  });

  it('PATCH edita campos y status DONE/PENDING fija y limpia completedAt', async () => {
    const task = await createTask(tokenA, {
      title: 'Leer',
      durationMinutes: 60,
      priority: 'MEDIUM',
      deadline: '2099-01-01',
    });

    const edited = await http()
      .patch(`/api/tasks/${task.id}`)
      .set(auth(tokenA))
      .send({ title: 'Leer capítulo 3', deadline: null, priority: 'HIGH' })
      .expect(200);
    expect(edited.body).toMatchObject({
      title: 'Leer capítulo 3',
      deadline: null,
      status: 'PENDING',
    });

    const done = await http()
      .patch(`/api/tasks/${task.id}`)
      .set(auth(tokenA))
      .send({ status: 'DONE' })
      .expect(200);
    expect((done.body as TaskBody).completedAt).not.toBeNull();

    const reopened = await http()
      .patch(`/api/tasks/${task.id}`)
      .set(auth(tokenA))
      .send({ status: 'PENDING' })
      .expect(200);
    expect(reopened.body).toMatchObject({
      status: 'PENDING',
      completedAt: null,
    });
  });

  it('calcula minutos completados con bloques COMPLETED y reevalúa al reducir la duración', async () => {
    const task = await createTask(tokenA, {
      title: 'Proyecto',
      durationMinutes: 120,
      priority: 'HIGH',
    });
    await seedBlock(task.id, '2026-10-26T22:00:00.000Z', 50, 'COMPLETED');
    await seedBlock(task.id, '2026-10-26T22:55:00.000Z', 45, 'SKIPPED');
    await seedBlock(task.id, '2026-10-27T22:00:00.000Z', 25, 'PLANNED');

    const [listed] = await listTasks(tokenA);
    expect(listed).toMatchObject({
      completedMinutes: 50,
      remainingMinutes: 70,
    });

    const shortened = await http()
      .patch(`/api/tasks/${task.id}`)
      .set(auth(tokenA))
      .send({ durationMinutes: 50 })
      .expect(200);
    expect(shortened.body).toMatchObject({
      status: 'DONE',
      remainingMinutes: 0,
    });
  });

  it('DELETE borra la tarea (204) y todos sus bloques', async () => {
    const task = await createTask(tokenA, {
      title: 'Borrar',
      durationMinutes: 60,
      priority: 'LOW',
    });
    await seedBlock(task.id, '2026-10-26T22:00:00.000Z', 30, 'COMPLETED');
    await seedBlock(task.id, '2026-10-26T22:35:00.000Z', 30, 'PLANNED');

    await http().delete(`/api/tasks/${task.id}`).set(auth(tokenA)).expect(204);
    expect(await listTasks(tokenA)).toEqual([]);
    expect(
      await prisma.scheduleBlock.count({ where: { taskId: task.id } }),
    ).toBe(0);
  });

  it('responde 401 sin token', async () => {
    await http().get('/api/tasks').expect(401);
    await http()
      .post('/api/tasks')
      .send({ title: 'T', durationMinutes: 60, priority: 'HIGH' })
      .expect(401);
  });

  it('B no ve las tareas de A y recibe 404 al editarlas o borrarlas', async () => {
    const task = await createTask(tokenA, {
      title: 'Privada',
      durationMinutes: 60,
      priority: 'HIGH',
    });
    expect(await listTasks(tokenB)).toEqual([]);
    await http()
      .patch(`/api/tasks/${task.id}`)
      .set(auth(tokenB))
      .send({ title: 'robada' })
      .expect(404);
    await http().delete(`/api/tasks/${task.id}`).set(auth(tokenB)).expect(404);
    await http().delete('/api/tasks/no-es-uuid').set(auth(tokenA)).expect(404);
    expect((await listTasks(tokenA))[0].title).toBe('Privada');
  });
});
