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

export const PRIORITIES: Priority[] = ['HIGH', 'MEDIUM', 'LOW'];

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Texto vacío → null (contracts/tasks.md). */
export const emptyToNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? null : trim({ value });

export const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// contracts/tasks.md · FR-006
export class CreateTaskDto {
  @Transform(trim)
  @IsString({ message: 'El título es obligatorio' })
  @Length(1, 120, { message: 'El título debe tener entre 1 y 120 caracteres' })
  title: string;

  @IsInt({ message: 'durationMinutes debe ser un entero' })
  @Min(15, { message: 'La duración mínima es de 15 minutos' })
  @Max(1440, { message: 'La duración máxima es de 1440 minutos' })
  @IsDivisibleBy(5, { message: 'La duración debe ser múltiplo de 5 minutos' })
  durationMinutes: number;

  @IsIn(PRIORITIES, { message: 'La prioridad debe ser HIGH, MEDIUM o LOW' })
  priority: Priority;

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
}
