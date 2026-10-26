import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { GenerateScheduleDto, WeekQueryDto } from './dto/week.dto';
import {
  ScheduleService,
  type GenerateResultDto,
  type WeekScheduleDto,
} from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get()
  getWeek(
    @CurrentUser() user: AuthUser,
    @Query() query: WeekQueryDto,
  ): Promise<WeekScheduleDto> {
    return this.schedule.getWeek(user.id, query.weekStart);
  }

  @Post('generate')
  @HttpCode(200)
  generate(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateScheduleDto,
  ): Promise<GenerateResultDto> {
    return this.schedule.generate(user.id, dto.weekStart);
  }
}
