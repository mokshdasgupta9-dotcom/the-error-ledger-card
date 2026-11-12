/**
 * Calendar-date helpers. Dates are plain "YYYY-MM-DD" strings in the person's LOCAL time zone.
 * Nothing here converts through UTC, so a date never shifts by a day because of the time zone.
 */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISODate(v: unknown): v is ISODate {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export const todayISO = (now: Date = new Date()): ISODate => toISODate(now);

export function addDays(s: ISODate, days: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole calendar days from b to a (a - b). Uses UTC arithmetic only to avoid daylight-saving drift. */
export function diffDays(a: ISODate, b: ISODate): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000);
}

/** 0 = Monday ... 6 = Sunday. */
export const weekdayIndex = (s: ISODate): number => (parseISODate(s).getDay() + 6) % 7;

/** The Monday of the week containing the given date. */
export const startOfWeek = (s: ISODate): ISODate => addDays(s, -weekdayIndex(s));

export const weekDates = (weekStart: ISODate): ISODate[] => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

export function msUntilNextMidnight(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return next.getTime() - now.getTime();
}

const formatter = (options: Intl.DateTimeFormatOptions) => (s: ISODate) =>
  new Intl.DateTimeFormat(undefined, options).format(parseISODate(s));

export const formatShort = formatter({ weekday: 'short', month: 'short', day: 'numeric' });
export const formatLong = formatter({ weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
export const formatMonthDay = formatter({ month: 'short', day: 'numeric' });
export const formatDayNumber = formatter({ day: 'numeric' });
export const formatWeekdayShort = formatter({ weekday: 'short' });

export function formatWeekRange(weekStart: ISODate): string {
  const end = addDays(weekStart, 6);
  return `${formatMonthDay(weekStart)} to ${formatMonthDay(end)}, ${parseISODate(end).getFullYear()}`;
}
