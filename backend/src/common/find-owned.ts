import { NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';

/**
 * Los recursos de otro usuario o con id mal formado se tratan como inexistentes (404),
 * nunca 403, para no revelar que existen (FR-003, research R7).
 */
export function assertValidId(id: string): void {
  if (!isUUID(id)) throw new NotFoundException('Recurso no encontrado');
}

export function orNotFound<T>(value: T | null): T {
  if (value === null) throw new NotFoundException('Recurso no encontrado');
  return value;
}
