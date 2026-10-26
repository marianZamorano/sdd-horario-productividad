import { Injectable } from '@nestjs/common';
import { assertValidId, orNotFound } from '../common/find-owned';
import type { Task } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTaskDto } from './dto/create-task.dto';
import type { TaskStatus, UpdateTaskDto } from './dto/update-task.dto';
import {
  compareTasks,
  isOverdue,
  remainingMinutes,
  type Priority,
} from './task-rules';

export interface TaskDto {
  id: string;
  title: string;
  durationMinutes: number;
  priority: Priority;
  deadline: string | null;
  category: string | null;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  completedMinutes: number;
  remainingMinutes: number;
  overdue: boolean;
}

const MINUTE_MS = 60_000;

/** `@db.Date` llega como medianoche UTC; se expone como `YYYY-MM-DD`. */
export const toIsoDate = (date: Date | null): string | null =>
  date ? date.toISOString().slice(0, 10) : null;

const fromIsoDate = (
  date: string | null | undefined,
): Date | null | undefined =>
  date === undefined
    ? undefined
    : date === null
      ? null
      : new Date(`${date}T00:00:00.000Z`);

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, status?: TaskStatus): Promise<TaskDto[]> {
    const [tasks, timezone, completed] = await Promise.all([
      this.prisma.task.findMany({
        where: { userId, ...(status ? { status } : {}) },
      }),
      this.timezoneOf(userId),
      this.completedMinutesByTask(userId),
    ]);
    const now = new Date();
    return tasks
      .map((task) =>
        this.toDto(task, completed.get(task.id) ?? 0, now, timezone),
      )
      .sort((a, b) =>
        compareTasks(now, timezone)(
          { ...a, createdAt: new Date(a.createdAt) },
          { ...b, createdAt: new Date(b.createdAt) },
        ),
      );
  }

  async create(userId: string, dto: CreateTaskDto): Promise<TaskDto> {
    const task = await this.prisma.task.create({
      data: {
        userId,
        title: dto.title,
        durationMinutes: dto.durationMinutes,
        priority: dto.priority,
        deadline: fromIsoDate(dto.deadline) ?? null,
        category: dto.category ?? null,
      },
    });
    return this.toDto(task, 0, new Date(), await this.timezoneOf(userId));
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    const current = await this.findOwned(userId, id);
    const completed = await this.completedMinutesOf(id);
    const durationMinutes = dto.durationMinutes ?? current.durationMinutes;

    // FR-008: status explícito manda; si cambia la duración y ya se completó, pasa a DONE.
    let status: TaskStatus = dto.status ?? current.status;
    if (
      dto.status === undefined &&
      dto.durationMinutes !== undefined &&
      completed >= durationMinutes
    ) {
      status = 'DONE';
    }
    const completedAt =
      status === 'DONE'
        ? current.status === 'DONE'
          ? current.completedAt
          : new Date()
        : null;

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        durationMinutes: dto.durationMinutes,
        priority: dto.priority,
        deadline: fromIsoDate(dto.deadline),
        category: dto.category,
        status,
        completedAt,
      },
    });
    return this.toDto(
      task,
      completed,
      new Date(),
      await this.timezoneOf(userId),
    );
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    // Los bloques caen en cascada (FR-009).
    await this.prisma.task.delete({ where: { id } });
  }

  /** Mapea a TaskDto con los campos derivados (data-model.md §Task). */
  toDto(
    task: Task,
    completedMinutes: number,
    now: Date,
    timezone: string,
  ): TaskDto {
    const deadline = toIsoDate(task.deadline);
    return {
      id: task.id,
      title: task.title,
      durationMinutes: task.durationMinutes,
      priority: task.priority,
      deadline,
      category: task.category,
      status: task.status,
      completedAt: task.completedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      completedMinutes,
      remainingMinutes: remainingMinutes(
        task.durationMinutes,
        completedMinutes,
      ),
      overdue: isOverdue({ status: task.status, deadline }, now, timezone),
    };
  }

  async findOwned(userId: string, id: string): Promise<Task> {
    assertValidId(id);
    return orNotFound(
      await this.prisma.task.findFirst({ where: { id, userId } }),
    );
  }

  async timezoneOf(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    return user.timezone;
  }

  async completedMinutesOf(taskId: string): Promise<number> {
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: { taskId, status: 'COMPLETED' },
      select: { startAt: true, endAt: true },
    });
    return blocks.reduce(
      (sum, b) => sum + (b.endAt.getTime() - b.startAt.getTime()) / MINUTE_MS,
      0,
    );
  }

  async completedMinutesByTask(userId: string): Promise<Map<string, number>> {
    const blocks = await this.prisma.scheduleBlock.findMany({
      where: { userId, status: 'COMPLETED' },
      select: { taskId: true, startAt: true, endAt: true },
    });
    const totals = new Map<string, number>();
    for (const b of blocks) {
      const minutes = (b.endAt.getTime() - b.startAt.getTime()) / MINUTE_MS;
      totals.set(b.taskId, (totals.get(b.taskId) ?? 0) + minutes);
    }
    return totals;
  }
}
