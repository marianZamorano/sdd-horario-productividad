import { isOriginAllowed, parseAllowedOrigins } from './cors';

describe('CORS origin matching (research R8)', () => {
  const allowed = parseAllowedOrigins(
    'http://localhost:5173, https://horario-web.vercel.app,https://horario-web-*.vercel.app',
  );

  it('allows exact origins', () => {
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
    expect(isOriginAllowed('https://horario-web.vercel.app', allowed)).toBe(
      true,
    );
  });

  it('allows preview subdomains through the * wildcard', () => {
    expect(
      isOriginAllowed(
        'https://horario-web-git-feat-abc-team.vercel.app',
        allowed,
      ),
    ).toBe(true);
  });

  it('rejects other origins, including look-alike domains', () => {
    expect(isOriginAllowed('https://evil.com', allowed)).toBe(false);
    expect(
      isOriginAllowed('https://horario-web-x.vercel.app.evil.com', allowed),
    ).toBe(false);
    expect(isOriginAllowed('http://horario-web-x.vercel.app', allowed)).toBe(
      false,
    );
  });

  it('returns an empty list when the variable is missing', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});
