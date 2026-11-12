import { Check, Clock, Minus, Moon } from 'lucide-react';
import { formatDayNumber, formatWeekdayShort, weekDates, type ISODate } from '../../lib/dates';
import { PLANNED_SCHEDULE, slotStatus, type PlannedSession, type WeekSummary } from '../../lib/schedule';
import type { SessionLog } from '../../types';
import { Button, cx } from '../ui';

export function WeekCalendar({
  week,
  today,
  onMark,
  onEdit,
}: {
  week: WeekSummary;
  today: ISODate;
  onMark: (slot: PlannedSession, date: ISODate) => void;
  onEdit: (log: SessionLog) => void;
}) {
  const dates = weekDates(week.weekStart);

  return (
    <ol aria-label="Week at a glance" className="grid gap-2 lg:grid-cols-7">
      {PLANNED_SCHEDULE.map((slot, i) => {
        const date = dates[i];
        const isToday = date === today;
        const logs = week.logs.filter((l) => l.date === date);
        const status = slot.rest ? null : slotStatus(slot, week, today);
        return (
          <li key={slot.key} className={cx('flex gap-3 rounded-xl border bg-surface p-3.5 lg:flex-col', isToday ? 'border-forest-600/60 shadow-soft' : 'border-line')}>
            <div className="w-14 shrink-0 lg:w-auto">
              <p className="text-[13px] font-medium text-ink-soft">{formatWeekdayShort(date)}</p>
              <p className="font-serif text-2xl leading-none tabular-nums text-ink">{formatDayNumber(date)}</p>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {slot.rest ? (
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <Moon className="size-4" aria-hidden="true" /> Rest
                </p>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium leading-snug text-ink">{slot.name}</p>
                    <p className="text-xs text-muted">{slot.minutes} min planned</p>
                  </div>
                  <p
                    className={cx(
                      'flex items-center gap-1.5 text-[13px] font-medium',
                      status === 'completed' ? 'text-forest-700' : 'text-muted',
                    )}
                  >
                    {status === 'completed' && <Check className="size-4" aria-hidden="true" />}
                    {status === 'missed' && <Minus className="size-4" aria-hidden="true" />}
                    {status === 'upcoming' && <Clock className="size-4" aria-hidden="true" />}
                    {status === 'completed' ? 'Completed' : status === 'missed' ? 'Missed' : isToday ? 'Today' : 'Upcoming'}
                  </p>
                  {status !== 'completed' && date <= today && (
                    <Button size="sm" aria-label={`Mark ${slot.name} complete`} onClick={() => onMark(slot, date)}>
                      Mark complete
                    </Button>
                  )}
                </>
              )}
              {logs.length > 0 && (
                <ul className="space-y-1">
                  {logs.map((log) => (
                    <li key={log.id}>
                      <button
                        type="button"
                        onClick={() => onEdit(log)}
                        aria-label={`Edit ${log.sessionName}, ${log.actualMinutes} minutes${log.completed ? '' : ', not completed'}`}
                        className="flex w-full items-center gap-1.5 rounded-md bg-sage-50 px-2 py-1 text-left text-xs text-ink-soft transition hover:bg-sage-100"
                      >
                        {log.completed ? <Check className="size-3.5 shrink-0 text-forest-700" aria-hidden="true" /> : <Minus className="size-3.5 shrink-0 text-muted" aria-hidden="true" />}
                        <span className="min-w-0 flex-1 truncate">{log.sessionKey === slot.key ? (log.completed ? 'Logged' : 'Partial') : log.sessionName}</span>
                        <span className="shrink-0 tabular-nums text-muted">{log.actualMinutes} min</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
