import {
  IsString,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { isMonday } from '../../common/time';

function IsMondayDate(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isMondayDate',
      target: target.constructor,
      propertyName,
      options: {
        message: 'weekStart debe ser un lunes con formato YYYY-MM-DD',
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isMonday(value),
      },
    });
}

/** `?weekStart=YYYY-MM-DD` (lunes) para GET /schedule y GET /stats/week. */
export class WeekQueryDto {
  @IsString({ message: 'weekStart es obligatorio' })
  @IsMondayDate()
  weekStart: string;
}

/** Body de POST /schedule/generate. */
export class GenerateScheduleDto {
  @IsString({ message: 'weekStart es obligatorio' })
  @IsMondayDate()
  weekStart: string;
}
