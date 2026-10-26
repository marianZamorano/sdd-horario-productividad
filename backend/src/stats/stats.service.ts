import { Injectable } from '@nestjs/common';
import { weekRange } from '../common/time';
import { PrismaService } from '../prisma/prisma.service';
import { computeWeekStats, type WeekStats } from './stats';

export interface WeekStatsDto extends WeekStats {
  weekStart: string;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async week(userId: string, weekStart: string): Promise<WeekStatsDto> {
    const { timezone } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { timezone: true },
    });
    const { start, end } = weekRange(weekStart, timezone);

    const [weekBlocks, completed, tasksCompletedInWeek] = await Promise.all([
      this.prisma.scheduleBlock.findMany({
        where: { userId, startAt: { gte: start, lt: end } },
        select: { startAt: true, endAt: true, status: true },
      }),
      this.prisma.scheduleBlock.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { startAt: true },
      }),
      // FR-021: tareas cuyo completedAt cae dentro de la semana local.
      this.prisma.task.count({
        where: { userId, status: 'DONE', completedAt: { gte: start, lt: end } },
      }),
    ]);

    return {
      weekStart,
      ...computeWeekStats({
        weekBlocks,
        tasksCompletedInWeek,
        completedBlockStarts: completed.map((b) => b.startAt),
        now: new Date(),
        timezone,
      }),
    };
  }
}
