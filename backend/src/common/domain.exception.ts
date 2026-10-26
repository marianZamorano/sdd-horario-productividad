import { HttpException, HttpStatus } from '@nestjs/common';

export type DomainErrorCode = 'EMAIL_TAKEN' | 'SLOT_OVERLAP';

/**
 * Error de dominio con `code` estable (contracts/README.md):
 * `{ statusCode, message, error, code }`.
 */
export class DomainException extends HttpException {
  constructor(
    code: DomainErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.CONFLICT,
  ) {
    super(
      {
        statusCode: status,
        message,
        error: HttpStatus[status] ?? 'Error',
        code,
      },
      status,
    );
  }
}
