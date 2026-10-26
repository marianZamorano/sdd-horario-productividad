import { IsIn, IsOptional } from 'class-validator';
import { TASK_STATUSES, type TaskStatus } from './update-task.dto';

export class ListTasksQueryDto {
  @IsOptional()
  @IsIn(TASK_STATUSES, { message: 'El estado debe ser PENDING o DONE' })
  status?: TaskStatus;
}
