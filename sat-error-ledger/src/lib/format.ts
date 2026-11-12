import type { Subject } from '../types';

export const SUBJECT_LABEL: Record<Subject, string> = { math: 'Math', rw: 'Reading & Writing' };

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Compact: "2 h 45 min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} h ${m} min`;
  if (h) return `${h} h`;
  return `${m} min`;
}

/** Sentence form: "3 hours and 10 minutes". */
export function formatDurationLong(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${plural(h, 'hour')} and ${plural(m, 'minute')}`;
  if (h) return plural(h, 'hour');
  return plural(m, 'minute');
}

export const formatHours = (minutes: number): string =>
  (minutes / 60).toLocaleString('en-US', { maximumFractionDigits: 1 });
