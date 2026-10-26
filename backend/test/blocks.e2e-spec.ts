import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, registerUser, resetDatabase } from './utils';

// contracts/schedule.md (PATCH /schedule/blocks/:id) · US5 · FR-007, FR-008, FR-019
interface PatchBody {
  block: { id: string; status: string; durationMinutes: number };
  task: {
    id: string;
    status: string;
    completedAt: string | null;
    completedMinutes: number;
    remainingMinutes: number;
  };
}

describe('Block status (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenA: string;
  let userA: string;
  let tokenB: string;
  let taskId: string;
  let blockIds: string[];
  const http = () => request(app.getHttpServer());
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  const patch = (id: string, status: string, token = tokenA) =>
    http()
      .patch(`/api/schedule/blocks/${id}`)
      .set(auth(token))
      .send({ status });

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

    const res = await http()
      .post('/api/tasks')
      .set(auth(tokenA))
      .send({ title: 'Ensayo', durationMinutes: 75, priority: 'HIGH' })
      .expect(201);
    taskId = (res.body as { id: string }).id;

    // Dos bloques: 50 + 25 = 75 min (la duración completa de la tarea).
    const starts = ['2026-11-02T22:00:00.000Z', '2026-11-02T22:55:00.000Z'];
    const minutes = [50, 25];
    blockIds = [];
    for (let i = 0; i < 2; i++) {
      const block = await prisma.scheduleBlock.create({
        data: {
          userId: userA,
          taskId,
          startAt: new Date(starts[i]),
          endAt: new Date(Date.parse(starts[i]) + minutes[i] * 60_000),
        },
      });
      blockIds.push(block.id);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('completar un bloque devuelve { block, task } con los minutos restantes actualizados', async () => {
    const res = await patch(blockIds[0], 'COMPLETED').expect(200);
    const body = res.body as PatchBody;
    expect(body.block).toMatchObject({
      id: blockIds[0],
      status: 'COMPLETED',
      durationMinutes: 50,
    });
    expect(body.task).toMatchObject({
      id: taskId,
      status: 'PENDING',
      completedMinutes: 50,
      remainingMinutes: 25,
    });
  });

  it('omitir no reduce los minutos restantes', async () => {
    const res = await patch(blockIds[0], 'SKIPPED').expect(200);
    expect((res.body as PatchBody).task).toMatchObject({
      completedMinutes: 0,
      remainingMinutes: 75,
    });
  });

  it('completar todos los bloques termina la tarea y deshacer la reabre', async () => {
    await patch(blockIds[0], 'COMPLETED').expect(200);
    const done = (await patch(blockIds[1], 'COMPLETED').expect(200))
      .body as PatchBody;
    expect(done.task.status).toBe('DONE');
    expect(done.task.completedAt).not.toBeNull();

    const reopened = (await patch(blockIds[1], 'PLANNED').expect(200))
      .body as PatchBody;
    expect(reopened.task).toMatchObject({
      status: 'PENDING',
      completedAt: null,
      remainingMinutes: 25,
    });
  });

  it('permite cualquier transición entre los tres estados', async () => {
    for (const status of [
      'COMPLETED',
      'SKIPPED',
      'PLANNED',
      'SKIPPED',
      'COMPLETED',
    ]) {
      const res = await patch(blockIds[0], status).expect(200);
      expect((res.body as PatchBody).block.status).toBe(status);
    }
  });

  it('rechaza un estado inválido o campos extra (400)', async () => {
    await patch(blockIds[0], 'DONE').expect(400);
    await http()
      .patch(`/api/schedule/blocks/${blockIds[0]}`)
      .set(auth(tokenA))
      .send({ status: 'COMPLETED', startAt: '2026-01-01T00:00:00Z' })
      .expect(400);
  });

  it('responde 401 sin token', async () => {
    await http()
      .patch(`/api/schedule/blocks/${blockIds[0]}`)
      .send({ status: 'COMPLETED' })
      .expect(401);
  });

  it('B no puede cambiar los bloques de A (404) y el bloque no cambia', async () => {
    await patch(blockIds[0], 'COMPLETED', tokenB).expect(404);
    await patch('no-es-uuid', 'COMPLETED').expect(404);
    const block = await prisma.scheduleBlock.findUniqueOrThrow({
      where: { id: blockIds[0] },
    });
    expect(block.status).toBe('PLANNED');
  });
});
