import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import type { TaskDto } from '../tasks/tasks.service';
import { UpdateBlockStatusDto } from './dto/update-block-status.dto';
import { GenerateScheduleDto, WeekQueryDto } from './dto/week.dto';
import {
  ScheduleService,
  type GenerateResultDto,
  type ScheduleBlockDto,
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

  @Patch('blocks/:id')
  updateBlockStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBlockStatusDto,
  ): Promise<{ block: ScheduleBlockDto; task: TaskDto }> {
    return this.schedule.updateBlockStatus(user.id, id, dto.status);
  }
}
