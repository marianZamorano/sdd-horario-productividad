import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/** Valida que el valor sea mayor que otra propiedad numérica del mismo objeto. */
export function IsGreaterThan(property: string, options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isGreaterThan',
      target: target.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const other = (args.object as Record<string, unknown>)[property];
          return (
            typeof value === 'number' &&
            typeof other === 'number' &&
            value > other
          );
        },
      },
    });
}
