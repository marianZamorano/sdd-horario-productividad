import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, type AuthUser } from '../common/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService, type TaskDto } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTasksQueryDto,
  ): Promise<TaskDto[]> {
    return this.tasks.list(user.id, query.status);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.tasks.remove(user.id, id);
  }
}
