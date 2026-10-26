import { addWeeks, formatDuration, formatHHmm, minutesFromHHmm, mondayOf } from './dates';

describe('dates helpers', () => {
  it('mondayOf devuelve el lunes local de la semana en YYYY-MM-DD', () => {
    expect(mondayOf(new Date(2026, 9, 26))).toBe('2026-10-26'); // lunes
    expect(mondayOf(new Date(2026, 9, 29, 23, 30))).toBe('2026-10-26'); // jueves
    expect(mondayOf(new Date(2026, 10, 1))).toBe('2026-10-26'); // domingo
  });

  it('addWeeks mueve semanas sobre un lunes YYYY-MM-DD', () => {
    expect(addWeeks('2026-10-26', 1)).toBe('2026-11-02');
    expect(addWeeks('2026-10-26', -1)).toBe('2026-10-19');
  });

  it('formatHHmm y minutesFromHHmm son inversos', () => {
    expect(formatHHmm(1080)).toBe('18:00');
    expect(formatHHmm(5)).toBe('00:05');
    expect(formatHHmm(1440)).toBe('24:00');
    expect(minutesFromHHmm('18:00')).toBe(1080);
    expect(minutesFromHHmm('24:00')).toBe(1440);
    expect(minutesFromHHmm('7:5')).toBeNull();
  });

  it('formatDuration muestra horas y minutos en español', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(125)).toBe('2 h 5 min');
  });
});
