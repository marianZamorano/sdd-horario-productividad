import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** Usuario autenticado que el JwtAuthGuard adjunta a la request. */
export interface AuthUser {
  id: string;
}

export type AuthenticatedRequest = Request & { user: AuthUser };

/** Inyecta el usuario autenticado: `@CurrentUser() user: AuthUser`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
