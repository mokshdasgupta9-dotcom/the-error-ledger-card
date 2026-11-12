import { addDays, formatMonthDay, type ISODate } from '../../lib/dates';
import { formatDuration } from '../../lib/format';
import { WEEKLY_SESSION_TARGET, type WeekSummary } from '../../lib/schedule';
import { Button, cx, EmptyState, Meter } from '../ui';

export function WeeklyHistory({
  weeks,
  selected,
  currentWeek,
  limit,
  onMore,
  onSelect,
}: {
  weeks: WeekSummary[];
  selected: ISODate;
  currentWeek: ISODate;
  limit: number;
  onMore: () => void;
  onSelect: (weekStart: ISODate) => void;
}) {
  const shown = weeks.slice(0, limit);
  return (
    <section aria-labelledby="history-heading" className="space-y-4">
      <div>
        <h2 id="history-heading" className="text-2xl text-ink">
          Weekly history
        </h2>
        <p className="mt-0.5 text-sm text-muted">Each bar shows sessions completed against the weekly target. Select a week to look closer.</p>
      </div>

      {weeks.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-soft">
          <EmptyState compact title="Your history will gather here">
            Once you log your first session, each week appears with its sessions, minutes and progress.
          </EmptyState>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
            {shown.map((week) => (
              <li key={week.weekStart}>
                <button
                  type="button"
                  onClick={() => onSelect(week.weekStart)}
                  aria-current={week.weekStart === selected ? 'true' : undefined}
                  className={cx(
                    'grid w-full items-center gap-x-5 gap-y-2 px-5 py-3.5 text-left transition hover:bg-white sm:grid-cols-[9.5rem_minmax(0,1fr)_15rem]',
                    week.weekStart === selected && 'bg-sage-50',
                  )}
                >
                  <span className="text-sm font-medium text-ink">
                    {week.weekStart === currentWeek ? 'This week' : `${formatMonthDay(week.weekStart)} to ${formatMonthDay(addDays(week.weekStart, 6))}`}
                  </span>
                  <Meter value={week.sessionsCompleted} max={WEEKLY_SESSION_TARGET} label={`Sessions completed, week of ${formatMonthDay(week.weekStart)}`} />
                  <span className="text-sm tabular-nums text-muted">
                    {week.sessionsCompleted} of {WEEKLY_SESSION_TARGET} sessions, {formatDuration(week.minutes)}, {week.percent}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {weeks.length > shown.length && (
            <Button size="sm" onClick={onMore}>
              Show earlier weeks
            </Button>
          )}
        </>
      )}
    </section>
  );
}
