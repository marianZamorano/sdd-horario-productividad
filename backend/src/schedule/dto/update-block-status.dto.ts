import { IsIn } from 'class-validator';
import type { BlockStatus } from '../schedule.service';

export const BLOCK_STATUSES: BlockStatus[] = [
  'PLANNED',
  'COMPLETED',
  'SKIPPED',
];

export class UpdateBlockStatusDto {
  @IsIn(BLOCK_STATUSES, {
    message: 'El estado debe ser PLANNED, COMPLETED o SKIPPED',
  })
  status: BlockStatus;
}
