import { Injectable } from '@nestjs/common';
import { assertValidId, orNotFound } from '../common/find-owned';
import { weekRange } from '../common/time';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService, toIsoDate, type TaskDto } from '../tasks/tasks.service';
import { isOverdue, type Priority } from '../tasks/task-rules';
import { nextTaskStatus } from './block-rules';
import { generateSchedule } from './scheduler';
import type { UnassignedReason } from './scheduler.types';

export type BlockStatus = 'PLANNED' | 'COMPLETED' | 'SKIPPED';

export interface ScheduleBlockDto {
  id: string;
  taskId: string;
  taskTitle: string;
  taskCategory: string | null;
  taskPriority: Priority;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: BlockStatus;
  overdue: boolean;
}

export interface WeekScheduleDto {
  weekStart: string;
  timezone: string;
  blocks: ScheduleBlockDto[];
}

export interface GenerateResultDto extends WeekScheduleDto {
  unassigned: {
    taskId: string;
    taskTitle: string;
    minutes: number;
    reason: UnassignedReason;
  }[];
  createdBlocks: number;
  hasAvailability: boolean;
  hasPendingTasks: boolean;
}

const MINUTE_MS = 60_000;
const minutesBetween = (start: Date, end: Date) =>
  Math.round((end.getTime() - start.getTime()) / MINUTE_MS);

type BlockWithTask = Prisma.ScheduleBlockGetPayload<{
  include: { task: true };
}>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
  ) {}

  /** FR-019 + FR-008: cambia el estado del bloque y recalcula el estado de su tarea. */
  async updateBlockStatus(
    userId: string,
    blockId: string,
    status: BlockStatus,
  ): Promise<{ block: ScheduleBlockDto; task: TaskDto }> {
    assertValidId(blockId);
    const timezone = await this.timezoneOf(userId);
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const current = orNotFound(
        await tx.scheduleBlock.findFirst({ where: { id: blockId, userId } }),
      );
      await tx.scheduleBlock.update({
        where: { id: blockId },
        data: { status },
      });

      const completed = await tx.scheduleBlock.findMany({
        where: { taskId: current.taskId, status: 'COMPLETED' },
        select: { startAt: true, endAt: true },
      });
      const completedMinutes = completed.reduce(
        (sum, b) => sum + minutesBetween(b.startAt, b.endAt),
        0,
      );

      const task = await tx.task.findUniqueOrThrow({
        where: { id: current.taskId },
      });
      const next = nextTaskStatus({
        task,
        completedMinutes,
        blockLeftCompleted:
          current.status === 'COMPLETED' && status !== 'COMPLETED',
        now,
      });
      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: next,
      });

      const block = await tx.scheduleBlock.findUniqueOrThrow({
        where: { id: blockId },
        include: { task: true },
      });
      return {
        block: this.toBlockDto(block, timezone, now),
        task: this.tasks.toDto(updatedTask, completedMinutes, now, timezone),
      };
    });
  }

  async getWeek(userId: string, weekStart: string): Promise<WeekScheduleDto> {
    const timezone = await this.timezoneOf(userId);
    const blocks = await this.weekBlocks(
      this.prisma,
      userId,
      weekStart,
      timezone,
    );
    return { weekStart, timezone, blocks: this.toBlockDtos(blocks, timezone) };
  }

  /** FR-010 a FR-017: borra los PLANNED de la semana, genera y guarda en una transacción. */
  async generate(
    userId: string,
    weekStart: string,
  ): Promise<GenerateResultDto> {
    const timezone = await this.timezoneOf(userId);
    const { start, end } = weekRange(weekStart, timezone);
    const now = new Date();

    return this.prisma.$transaction(
      async (tx) => {
        // Serializa las generaciones del mismo usuario (doble clic, varias pestañas).
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

        await tx.scheduleBlock.deleteMany({
          where: {
            userId,
            status: 'PLANNED',
            startAt: { gte: start, lt: end },
          },
        });

        const [slots, tasks, kept, otherBlocks] = await Promise.all([
          tx.availabilitySlot.findMany({ where: { userId } }),
          tx.task.findMany({ where: { userId, status: 'PENDING' } }),
          tx.scheduleBlock.findMany({
            where: {
              userId,
              status: { in: ['COMPLETED', 'SKIPPED'] },
              startAt: { gte: start, lt: end },
            },
          }),
          // Completados (de cualquier semana) y PLANNED que quedan (de otras semanas).
          tx.scheduleBlock.findMany({
            where: { userId, status: { in: ['COMPLETED', 'PLANNED'] } },
            select: { taskId: true, startAt: true, endAt: true },
          }),
        ]);

        const used = new Map<string, number>();
        for (const b of otherBlocks) {
          used.set(
            b.taskId,
            (used.get(b.taskId) ?? 0) + minutesBetween(b.startAt, b.endAt),
          );
        }
        const schedulerTasks = tasks
          .map((t) => ({
            id: t.id,
            pendingMinutes: Math.max(
              0,
              t.durationMinutes - (used.get(t.id) ?? 0),
            ),
            priority: t.priority,
            deadline: toIsoDate(t.deadline),
            createdAt: t.createdAt,
          }))
          .filter((t) => t.pendingMinutes > 0);

        const result = generateSchedule({
          now,
          timezone,
          weekStart,
          slots,
          tasks: schedulerTasks,
          keptBlocks: kept,
        });

        await tx.scheduleBlock.createMany({
          data: result.blocks.map((b) => ({ userId, ...b })),
        });

        const titles = new Map(tasks.map((t) => [t.id, t.title]));
        const blocks = await this.weekBlocks(tx, userId, weekStart, timezone);
        return {
          weekStart,
          timezone,
          blocks: this.toBlockDtos(blocks, timezone, now),
          unassigned: result.unassigned.map((u) => ({
            ...u,
            taskTitle: titles.get(u.taskId) ?? '',
          })),
          createdBlocks: result.blocks.length,
          hasAvailability: slots.length > 0,
          hasPendingTasks: schedulerTasks.length > 0,
        };
      },
      { timeout: 15_000 },
    );
  }

  toBlockDto(
    block: BlockWithTask,
    timezone: string,
    now = new Date(),
  ): ScheduleBlockDto {
    return {
      id: block.id,
      taskId: block.taskId,
      taskTitle: block.task.title,
      taskCategory: block.task.category,
      taskPriority: block.task.priority,
      startAt: block.startAt.toISOString(),
      endAt: block.endAt.toISOString(),
      durationMinutes: minutesBetween(block.startAt, block.endAt),
      status: block.status,
      overdue: isOverdue(
        { status: block.task.status, deadline: toIsoDate(block.task.deadline) },
        now,
        timezone,
      ),
    };
  }

  private toBlockDtos(
    blocks: BlockWithTask[],
    timezone: string,
    now = new Date(),
  ) {
    return blocks.map((b) => this.toBlockDto(b, timezone, now));
  }

  private weekBlocks(
    db: Tx | PrismaService,
    userId: string,
    weekStart: string,
    timezone: string,
  ) {
    const { start, end } = weekRange(weekStart, timezone);
    return db.scheduleBlock.findMany({
      where: { userId, startAt: { gte: start, lt: end } },
      include: { task: true },
      orderBy: { startAt: 'asc' },
    });
  }

  async timezoneOf(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    return user.timezone;
  }
}
