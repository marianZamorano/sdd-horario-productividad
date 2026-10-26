import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { isOriginAllowed, parseAllowedOrigins } from './common/cors';
import { HttpExceptionFilter } from './common/http-exception.filter';

/** Aplana los errores de class-validator; los DTO definen sus mensajes en español. */
function validationMessages(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.entries(error.constraints ?? {}).map(([key, message]) =>
      key === 'whitelistValidation'
        ? `El campo ${path} no está permitido`
        : message,
    );
    return [...own, ...validationMessages(error.children ?? [], path)];
  });
}

/** Configuración compartida por `main.ts` y los tests e2e (constitución IV y V). */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException(validationMessages(errors)),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const allowedOrigins = parseAllowedOrigins(process.env.CORS_ORIGIN);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Sin cabecera Origin (curl, health checks) no aplica CORS.
      callback(null, !origin || isOriginAllowed(origin, allowedOrigins));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}
