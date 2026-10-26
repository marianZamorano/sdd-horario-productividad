// CORS_ORIGIN: lista de orígenes exactos separada por comas (spec 002 FR-021).

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export function isOriginAllowed(origin: string, allowed: string[]): boolean {
  return allowed.includes(origin);
}
