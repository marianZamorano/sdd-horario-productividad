import { isOriginAllowed, parseAllowedOrigins } from './cors';

describe('CORS origin matching (spec 002 FR-021)', () => {
  const allowed = parseAllowedOrigins(
    'http://localhost:5173, https://horario-web.vercel.app',
  );

  it('allows exact origins', () => {
    expect(isOriginAllowed('http://localhost:5173', allowed)).toBe(true);
    expect(isOriginAllowed('https://horario-web.vercel.app', allowed)).toBe(
      true,
    );
  });

  it('no longer treats * as a wildcard (previews were removed)', () => {
    const withStar = parseAllowedOrigins('https://horario-web-*.vercel.app');
    expect(
      isOriginAllowed(
        'https://horario-web-git-feat-abc-team.vercel.app',
        withStar,
      ),
    ).toBe(false);
  });

  it('rejects other origins, including look-alike domains', () => {
    expect(isOriginAllowed('https://evil.com', allowed)).toBe(false);
    expect(
      isOriginAllowed('https://horario-web.vercel.app.evil.com', allowed),
    ).toBe(false);
    expect(isOriginAllowed('http://horario-web.vercel.app', allowed)).toBe(
      false,
    );
  });

  it('returns an empty list when the variable is missing', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });
});
