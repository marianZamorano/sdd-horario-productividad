import { Transform } from 'class-transformer';
import {
  IsDivisibleBy,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { Priority } from '../task-rules';
import { emptyToNull, ISO_DATE, PRIORITIES, trim } from './create-task.dto';

export const TASK_STATUSES = ['PENDING', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

// Subconjunto de CreateTaskDto + status (contracts/tasks.md, FR-008)
export class UpdateTaskDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'El título debe ser texto' })
  @Length(1, 120, { message: 'El título debe tener entre 1 y 120 caracteres' })
  title?: string;

  @IsOptional()
  @IsInt({ message: 'durationMinutes debe ser un entero' })
  @Min(15, { message: 'La duración mínima es de 15 minutos' })
  @Max(1440, { message: 'La duración máxima es de 1440 minutos' })
  @IsDivisibleBy(5, { message: 'La duración debe ser múltiplo de 5 minutos' })
  durationMinutes?: number;

  @IsOptional()
  @IsIn(PRIORITIES, { message: 'La prioridad debe ser HIGH, MEDIUM o LOW' })
  priority?: Priority;

  @IsOptional()
  @Matches(ISO_DATE, {
    message: 'La fecha límite debe tener formato YYYY-MM-DD',
  })
  deadline?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString({ message: 'La categoría debe ser texto' })
  @MaxLength(40, { message: 'La categoría admite como máximo 40 caracteres' })
  category?: string | null;

  @IsOptional()
  @IsIn(TASK_STATUSES, { message: 'El estado debe ser PENDING o DONE' })
  status?: TaskStatus;
}
