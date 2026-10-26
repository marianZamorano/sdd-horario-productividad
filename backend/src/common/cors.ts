// CORS_ORIGIN: lista separada por comas; `*` comodín dentro del host (previews de Vercel).

function escapeRegExp(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

export function parseAllowedOrigins(raw: string | undefined): RegExp[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map(
      (origin) =>
        new RegExp(
          `^${escapeRegExp(origin).replace(/\*/g, '[a-z0-9-]+')}$`,
          'i',
        ),
    );
}

export function isOriginAllowed(origin: string, allowed: RegExp[]): boolean {
  return allowed.some((pattern) => pattern.test(origin));
}
