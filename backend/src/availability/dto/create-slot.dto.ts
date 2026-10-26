import { IsDivisibleBy, IsInt, Max, Min } from 'class-validator';
import { IsGreaterThan } from '../../common/is-after.validator';

// contracts/availability.md · FR-004, FR-005
export class CreateSlotDto {
  @IsInt({ message: 'weekday debe ser un entero' })
  @Min(1, { message: 'weekday debe estar entre 1 (lunes) y 7 (domingo)' })
  @Max(7, { message: 'weekday debe estar entre 1 (lunes) y 7 (domingo)' })
  weekday: number;

  @IsInt({ message: 'startMinute debe ser un entero' })
  @Min(0, { message: 'startMinute debe estar entre 0 y 1425' })
  @Max(1425, { message: 'startMinute debe estar entre 0 y 1425' })
  @IsDivisibleBy(15, { message: 'startMinute debe ser múltiplo de 15' })
  startMinute: number;

  @IsInt({ message: 'endMinute debe ser un entero' })
  @Min(15, { message: 'endMinute debe estar entre 15 y 1440' })
  @Max(1440, {
    message:
      'endMinute debe estar entre 15 y 1440 (la franja no puede cruzar la medianoche)',
  })
  @IsDivisibleBy(15, { message: 'endMinute debe ser múltiplo de 15' })
  @IsGreaterThan('startMinute', {
    message: 'La hora de fin debe ser posterior a la de inicio',
  })
  endMinute: number;
}
