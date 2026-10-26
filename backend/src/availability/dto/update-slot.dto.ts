import { IsDivisibleBy, IsInt, IsOptional, Max, Min } from 'class-validator';

// Subconjunto de CreateSlotDto; el orden inicio < fin se valida en el servicio con los
// valores ya combinados con la franja guardada.
export class UpdateSlotDto {
  @IsOptional()
  @IsInt({ message: 'weekday debe ser un entero' })
  @Min(1, { message: 'weekday debe estar entre 1 (lunes) y 7 (domingo)' })
  @Max(7, { message: 'weekday debe estar entre 1 (lunes) y 7 (domingo)' })
  weekday?: number;

  @IsOptional()
  @IsInt({ message: 'startMinute debe ser un entero' })
  @Min(0, { message: 'startMinute debe estar entre 0 y 1425' })
  @Max(1425, { message: 'startMinute debe estar entre 0 y 1425' })
  @IsDivisibleBy(15, { message: 'startMinute debe ser múltiplo de 15' })
  startMinute?: number;

  @IsOptional()
  @IsInt({ message: 'endMinute debe ser un entero' })
  @Min(15, { message: 'endMinute debe estar entre 15 y 1440' })
  @Max(1440, { message: 'endMinute debe estar entre 15 y 1440' })
  @IsDivisibleBy(15, { message: 'endMinute debe ser múltiplo de 15' })
  endMinute?: number;
}
