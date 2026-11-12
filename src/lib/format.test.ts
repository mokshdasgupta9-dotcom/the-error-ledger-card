import { describe, expect, it } from 'vitest';
import { formatDuration, formatDurationLong, formatHours } from './format';

describe('duration formatting', () => {
  it('reads naturally in sentences', () => {
    expect(formatDurationLong(190)).toBe('3 hours and 10 minutes');
    expect(formatDurationLong(60)).toBe('1 hour');
    expect(formatDurationLong(45)).toBe('45 minutes');
    expect(formatDurationLong(1)).toBe('1 minute');
  });
  it('is compact in tiles', () => {
    expect(formatDuration(165)).toBe('2 h 45 min');
    expect(formatDuration(120)).toBe('2 h');
    expect(formatDuration(30)).toBe('30 min');
    expect(formatHours(210)).toBe('3.5');
  });
});
