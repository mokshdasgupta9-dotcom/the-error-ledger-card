import { describe, expect, it } from 'vitest';
import { addDays, diffDays, isValidISODate, msUntilNextMidnight, startOfWeek, toISODate, weekdayIndex } from './dates';

describe('local dates', () => {
  it('formats the local calendar date, never the UTC one', () => {
    expect(toISODate(new Date(2026, 10, 9, 0, 5))).toBe('2026-11-09');
    expect(toISODate(new Date(2026, 10, 9, 23, 55))).toBe('2026-11-09');
  });

  it('adds days across month, year and leap-day boundaries', () => {
    expect(addDays('2026-11-09', 2)).toBe('2026-11-11');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-27', 2)).toBe('2028-02-29');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('is stable across daylight-saving changes', () => {
    expect(addDays('2027-03-13', 1)).toBe('2027-03-14');
    expect(addDays('2027-03-14', 1)).toBe('2027-03-15');
    expect(addDays('2027-11-06', 2)).toBe('2027-11-08');
    expect(diffDays('2027-03-15', '2027-03-13')).toBe(2);
    expect(diffDays('2027-11-08', '2027-11-06')).toBe(2);
    expect(diffDays('2026-11-09', '2026-11-11')).toBe(-2);
  });

  it('treats Monday as the first day of the week', () => {
    expect(weekdayIndex('2026-11-09')).toBe(0); // Monday
    expect(weekdayIndex('2026-11-15')).toBe(6); // Sunday
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-12')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-15')).toBe('2026-11-09');
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16');
  });

  it('validates calendar dates strictly', () => {
    expect(isValidISODate('2026-11-09')).toBe(true);
    expect(isValidISODate('2026-02-30')).toBe(false);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate('11/09/2026')).toBe(false);
    expect(isValidISODate(20261109)).toBe(false);
  });

  it('knows how long until the next local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 10, 9, 23, 0, 0))).toBe(60 * 60 * 1000);
  });
});
