import {
  endOfLocalDay,
  isMonday,
  isValidTimezone,
  localDateOf,
  roundUpTo5,
  weekRange,
} from './time';

describe('time utilities', () => {
  describe('isMonday', () => {
    it('accepts a Monday in YYYY-MM-DD', () => {
      expect(isMonday('2026-10-26')).toBe(true);
    });

    it('rejects other weekdays and malformed dates', () => {
      expect(isMonday('2026-10-27')).toBe(false);
      expect(isMonday('2026-02-30')).toBe(false);
      expect(isMonday('26-10-2026')).toBe(false);
      expect(isMonday('')).toBe(false);
    });
  });

  describe('isValidTimezone', () => {
    it('accepts IANA zones and rejects garbage', () => {
      expect(isValidTimezone('America/La_Paz')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('Mars/Olympus')).toBe(false);
    });
  });

  describe('weekRange', () => {
    it('returns the local Monday 00:00 to next Monday 00:00 as UTC instants', () => {
      // America/La_Paz is UTC-4 all year.
      const { start, end } = weekRange('2026-10-26', 'America/La_Paz');
      expect(start.toISOString()).toBe('2026-10-26T04:00:00.000Z');
      expect(end.toISOString()).toBe('2026-11-02T04:00:00.000Z');
    });

    it('handles a DST transition week (Europe/Madrid ends DST on 2026-10-25)', () => {
      // Week of 2026-10-19: starts in CEST (UTC+2), the next Monday is in CET (UTC+1).
      const { start, end } = weekRange('2026-10-19', 'Europe/Madrid');
      expect(start.toISOString()).toBe('2026-10-18T22:00:00.000Z');
      expect(end.toISOString()).toBe('2026-10-25T23:00:00.000Z');
      expect(end.getTime() - start.getTime()).toBe(
        (7 * 24 + 1) * 60 * 60 * 1000,
      );
    });
  });

  describe('localDateOf', () => {
    it('returns the calendar date in the given zone', () => {
      const instant = new Date('2026-10-27T02:30:00.000Z');
      expect(localDateOf(instant, 'America/La_Paz')).toBe('2026-10-26');
      expect(localDateOf(instant, 'UTC')).toBe('2026-10-27');
    });
  });

  describe('endOfLocalDay', () => {
    it('returns the last millisecond of that local day as a UTC instant', () => {
      expect(endOfLocalDay('2026-10-30', 'America/La_Paz').toISOString()).toBe(
        '2026-10-31T03:59:59.999Z',
      );
    });
  });

  describe('roundUpTo5', () => {
    it('rounds up to the next 5-minute boundary', () => {
      expect(
        roundUpTo5(new Date('2026-10-26T18:02:10.000Z')).toISOString(),
      ).toBe('2026-10-26T18:05:00.000Z');
    });

    it('keeps an exact boundary unchanged', () => {
      expect(
        roundUpTo5(new Date('2026-10-26T18:05:00.000Z')).toISOString(),
      ).toBe('2026-10-26T18:05:00.000Z');
    });
  });
});
