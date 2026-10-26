import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidTimezone } from './time';

/** Valida que el valor sea una zona horaria IANA (p. ej. `America/La_Paz`). */
export function IsTimezone(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isTimezone',
      target: target.constructor,
      propertyName,
      options: {
        message: `${propertyName} debe ser una zona horaria IANA válida`,
        ...options,
      },
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && isValidTimezone(value),
      },
    });
}
