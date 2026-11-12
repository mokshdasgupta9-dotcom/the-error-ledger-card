import { describe, expect, it } from 'vitest';
import {
  buildWeeklyHistory,
  mostConsistentDay,
  PLANNED_SCHEDULE,
  rhythmStreak,
  slotStatus,
  summarizeWeek,
  WEEKLY_MINUTES_TARGET,
  WEEKLY_SESSION_TARGET,
} from './schedule';
import { addDays } from './dates';
import type { SessionLog } from '../types';

let counter = 0;
const log = (over: Partial<SessionLog> & Pick<SessionLog, 'date'>): SessionLog => ({
  id: `l${(counter += 1)}`,
  sessionKey: 'mon',
  sessionName: 'Math Foundations',
  plannedMinutes: 30,
  actualMinutes: 30,
  completed: true,
  notes: '',
  createdAt: '2026-11-09T10:00:00.000Z',
  ...over,
});

/** `count` completed sessions starting on the Monday of the given week. */
const weekOf = (weekStart: string, count: number): SessionLog[] =>
  Array.from({ length: count }, (_, i) => log({ date: addDays(weekStart, i) }));

const MON = '2026-11-09';

describe('weekly targets', () => {
  it('are 5 sessions and 210 minutes (3.5 hours)', () => {
    expect(WEEKLY_SESSION_TARGET).toBe(5);
    expect(WEEKLY_MINUTES_TARGET).toBe(210);
    expect(PLANNED_SCHEDULE.map((s) => s.name)).toEqual([
      'Math Foundations',
      'Math Applications & Retrieval',
      'Rest',
      'Craft & Structure',
      'Rest',
      'Retrieval & Information and Ideas',
      'Weekly Mixed Set & Reflection',
    ]);
  });
});

describe('summarizeWeek', () => {
  it('counts sessions completed and minutes studied', () => {
    const logs = [
      log({ date: '2026-11-09', actualMinutes: 30 }),
      log({ date: '2026-11-10', sessionKey: 'tue', actualMinutes: 35 }),
      log({ date: '2026-11-12', sessionKey: 'thu', actualMinutes: 30 }),
      log({ date: '2026-11-14', sessionKey: 'sat', actualMinutes: 70 }),
    ];
    const week = summarizeWeek(logs, MON);
    expect(week.sessionsCompleted).toBe(4);
    expect(week.minutes).toBe(165);
    expect(week.percent).toBe(80);
  });

  it('never counts a skipped or cut-short session as completed, but keeps the minutes studied', () => {
    const logs = [
      log({ date: '2026-11-09' }),
      log({ date: '2026-11-10', sessionKey: 'tue', completed: false, actualMinutes: 0 }),
      log({ date: '2026-11-12', sessionKey: 'thu', completed: false, actualMinutes: 12 }),
    ];
    const week = summarizeWeek(logs, MON);
    expect(week.sessionsCompleted).toBe(1);
    expect(week.minutes).toBe(42);
    expect(week.percent).toBe(20);
  });

  it('runs Monday to Sunday', () => {
    const logs = [log({ date: '2026-11-08' }), log({ date: '2026-11-09' }), log({ date: '2026-11-15' }), log({ date: '2026-11-16' })];
    expect(summarizeWeek(logs, MON).sessionsCompleted).toBe(2);
  });

  it('caps the percentage at 100 when extra sessions are logged', () => {
    const week = summarizeWeek(weekOf(MON, 7), MON);
    expect(week.sessionsCompleted).toBe(7);
    expect(week.percent).toBe(100);
  });
});

describe('slotStatus', () => {
  const monday = PLANNED_SCHEDULE[0];
  const tuesday = PLANNED_SCHEDULE[1];
  it('distinguishes completed, missed and upcoming', () => {
    const week = summarizeWeek([log({ date: '2026-11-09' })], MON);
    expect(slotStatus(monday, week, '2026-11-11')).toBe('completed');
    expect(slotStatus(tuesday, week, '2026-11-11')).toBe('missed');
    expect(slotStatus(tuesday, week, '2026-11-10')).toBe('upcoming'); // today still counts as upcoming
    expect(slotStatus(tuesday, week, '2026-11-09')).toBe('upcoming');
  });

  it('credits a planned session done on a different day of the same week', () => {
    const week = summarizeWeek([log({ date: '2026-11-11', sessionKey: 'mon' })], MON);
    expect(slotStatus(monday, week, '2026-11-13')).toBe('completed');
  });
});

describe('history and insights', () => {
  it('lists every week from the first log to now, including empty weeks', () => {
    const logs = [...weekOf('2026-10-26', 3), ...weekOf('2026-11-09', 2)];
    const history = buildWeeklyHistory(logs, '2026-11-12');
    expect(history.map((w) => [w.weekStart, w.sessionsCompleted])).toEqual([
      ['2026-11-09', 2],
      ['2026-11-02', 0],
      ['2026-10-26', 3],
    ]);
    expect(buildWeeklyHistory([], '2026-11-12')).toEqual([]);
  });

  it('finds the most consistent day once there is enough data', () => {
    expect(mostConsistentDay(weekOf(MON, 2))).toBeNull();
    const thursdays = [log({ date: '2026-11-12' }), log({ date: '2026-11-19' }), log({ date: '2026-11-09' })];
    expect(mostConsistentDay(thursdays)).toBe(3);
  });

  it('counts consecutive weeks with four or more sessions, without letting the current week break the run', () => {
    const logs = [...weekOf('2026-10-19', 4), ...weekOf('2026-10-26', 5), ...weekOf('2026-11-02', 4)];
    expect(rhythmStreak(logs, '2026-11-09')).toBe(3); // this week has nothing yet
    expect(rhythmStreak([...logs, ...weekOf('2026-11-09', 4)], '2026-11-12')).toBe(4);
    expect(rhythmStreak([...logs, ...weekOf('2026-11-09', 4)].filter((l) => l.date !== '2026-11-04'), '2026-11-12')).toBe(1);
    expect(rhythmStreak([], '2026-11-12')).toBe(0);
  });
});
