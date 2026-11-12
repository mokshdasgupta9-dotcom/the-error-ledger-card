import { addDays, startOfWeek, weekdayIndex, type ISODate } from './dates';
import type { SessionLog } from '../types';

export interface PlannedSession {
  key: string;
  /** 0 = Monday ... 6 = Sunday. */
  weekday: number;
  name: string;
  minutes: number;
  rest: boolean;
}

export const PLANNED_SCHEDULE: readonly PlannedSession[] = [
  { key: 'mon', weekday: 0, name: 'Math Foundations', minutes: 30, rest: false },
  { key: 'tue', weekday: 1, name: 'Math Applications & Retrieval', minutes: 30, rest: false },
  { key: 'wed', weekday: 2, name: 'Rest', minutes: 0, rest: true },
  { key: 'thu', weekday: 3, name: 'Craft & Structure', minutes: 30, rest: false },
  { key: 'fri', weekday: 4, name: 'Rest', minutes: 0, rest: true },
  { key: 'sat', weekday: 5, name: 'Retrieval & Information and Ideas', minutes: 60, rest: false },
  { key: 'sun', weekday: 6, name: 'Weekly Mixed Set & Reflection', minutes: 60, rest: false },
];

export const STUDY_SESSIONS = PLANNED_SCHEDULE.filter((s) => !s.rest);
export const WEEKLY_SESSION_TARGET = STUDY_SESSIONS.length; // 5
export const WEEKLY_MINUTES_TARGET = STUDY_SESSIONS.reduce((sum, s) => sum + s.minutes, 0); // 210
/** A week counts toward the "rhythm" insight when at least this many sessions were completed. */
export const RHYTHM_THRESHOLD = 4;

export interface WeekSummary {
  weekStart: ISODate;
  sessionsCompleted: number;
  /** Minutes actually studied: every logged session counts, completed or not. */
  minutes: number;
  /** Share of the weekly session target reached, capped at 100. */
  percent: number;
  logs: SessionLog[];
}

function summarize(weekStart: ISODate, logs: SessionLog[]): WeekSummary {
  const sessionsCompleted = logs.filter((l) => l.completed).length;
  const minutes = logs.reduce((sum, l) => sum + l.actualMinutes, 0);
  const percent = Math.min(100, Math.round((sessionsCompleted / WEEKLY_SESSION_TARGET) * 100));
  return { weekStart, sessionsCompleted, minutes, percent, logs };
}

export function summarizeWeek(all: SessionLog[], weekStart: ISODate): WeekSummary {
  const end = addDays(weekStart, 6);
  const logs = all
    .filter((l) => l.date >= weekStart && l.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return summarize(weekStart, logs);
}

export type SlotStatus = 'completed' | 'missed' | 'upcoming';

/** A planned session is completed if a completed log for it exists anywhere in that week. */
export function slotStatus(slot: PlannedSession, week: WeekSummary, today: ISODate): SlotStatus {
  if (week.logs.some((l) => l.completed && l.sessionKey === slot.key)) return 'completed';
  return addDays(week.weekStart, slot.weekday) < today ? 'missed' : 'upcoming';
}

/** Every week from the first logged week to the current one, most recent first. */
export function buildWeeklyHistory(logs: SessionLog[], today: ISODate): WeekSummary[] {
  if (!logs.length) return [];
  const buckets = new Map<ISODate, SessionLog[]>();
  let first = startOfWeek(today);
  let last = first;
  for (const log of logs) {
    const week = startOfWeek(log.date);
    if (week < first) first = week;
    if (week > last) last = week;
    const bucket = buckets.get(week);
    if (bucket) bucket.push(log);
    else buckets.set(week, [log]);
  }
  const weeks: WeekSummary[] = [];
  for (let week = last; week >= first; week = addDays(week, -7)) {
    weeks.push(summarize(week, buckets.get(week) ?? []));
  }
  return weeks;
}

/** The weekday (0 = Monday) with the most completed sessions, once there is enough data to say. */
export function mostConsistentDay(logs: SessionLog[]): number | null {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  let total = 0;
  for (const log of logs) {
    if (!log.completed) continue;
    counts[weekdayIndex(log.date)] += 1;
    total += 1;
  }
  if (total < 3) return null;
  const max = Math.max(...counts);
  return max >= 2 ? counts.indexOf(max) : null;
}

/**
 * Consecutive weeks with at least RHYTHM_THRESHOLD completed sessions. A week still in progress
 * never breaks the run: if this week has not reached the threshold yet, counting starts last week.
 */
export function rhythmStreak(logs: SessionLog[], today: ISODate): number {
  const current = startOfWeek(today);
  const meets = (week: ISODate) => summarizeWeek(logs, week).sessionsCompleted >= RHYTHM_THRESHOLD;
  let week = meets(current) ? current : addDays(current, -7);
  let streak = 0;
  while (meets(week)) {
    streak += 1;
    week = addDays(week, -7);
  }
  return streak;
}

export function nextPlannedSession(week: WeekSummary, today: ISODate): { slot: PlannedSession; date: ISODate } | null {
  for (const slot of STUDY_SESSIONS) {
    const date = addDays(week.weekStart, slot.weekday);
    const done = week.logs.some((l) => l.completed && l.sessionKey === slot.key);
    if (date >= today && !done) return { slot, date };
  }
  return null;
}
