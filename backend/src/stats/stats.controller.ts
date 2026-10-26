import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { WeekQueryDto } from '../schedule/dto/week.dto';
import { StatsService, type WeekStatsDto } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get('week')
  week(
    @CurrentUser() user: AuthUser,
    @Query() query: WeekQueryDto,
  ): Promise<WeekStatsDto> {
    return this.stats.week(user.id, query.weekStart);
  }
}
