import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { addDays, formatLong, formatWeekRange, startOfWeek, type ISODate } from '../../lib/dates';
import { formatDuration, formatDurationLong, formatHours, WEEKDAY_NAMES } from '../../lib/format';
import {
  buildWeeklyHistory,
  mostConsistentDay,
  nextPlannedSession,
  rhythmStreak,
  summarizeWeek,
  WEEKLY_MINUTES_TARGET,
  WEEKLY_SESSION_TARGET,
  RHYTHM_THRESHOLD,
  type PlannedSession,
} from '../../lib/schedule';
import { useLedger } from '../../state/ledger-context';
import type { SessionInput, SessionLog } from '../../types';
import { Button, ConfirmDialog, IconButton, Meter } from '../ui';
import { SessionForm, type SessionPreset } from './SessionForm';
import { WeekCalendar } from './WeekCalendar';
import { WeeklyHistory } from './WeeklyHistory';

type FormState = { mode: 'create'; preset?: SessionPreset } | { mode: 'edit'; log: SessionLog };

function Tile({ label, value, unit, sub, meter }: { label: string; value: string; unit?: string; sub?: string; meter?: { value: number; max: number } }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4 shadow-soft">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1.5">
        <span className="font-serif text-[2rem] leading-tight tabular-nums text-ink">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </p>
      {meter && (
        <div className="mt-2">
          <Meter value={meter.value} max={meter.max} label={label} />
        </div>
      )}
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function ConsistencyTab() {
  const { data, today, addSession, updateSession, deleteSession } = useLedger();
  const currentWeek = startOfWeek(today);
  const [weekStart, setWeekStart] = useState<ISODate>(currentWeek);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteLog, setDeleteLog] = useState<SessionLog | null>(null);
  const [historyLimit, setHistoryLimit] = useState(8);

  const isCurrent = weekStart === currentWeek;
  const week = useMemo(() => summarizeWeek(data.sessions, weekStart), [data.sessions, weekStart]);
  const history = useMemo(() => buildWeeklyHistory(data.sessions, today), [data.sessions, today]);
  const bestDay = useMemo(() => mostConsistentDay(data.sessions), [data.sessions]);
  const streak = useMemo(() => rhythmStreak(data.sessions, today), [data.sessions, today]);

  const shiftWeek = (weeks: number) => {
    const next = addDays(weekStart, weeks * 7);
    setWeekStart(next > currentWeek ? currentWeek : next);
  };

  const save = (input: SessionInput) => {
    if (form?.mode === 'edit') updateSession(form.log.id, input);
    else addSession(input);
    setForm(null);
    setWeekStart(startOfWeek(input.date));
  };

  const insights: string[] = [];
  const when = isCurrent ? 'this week' : 'that week';
  if (week.sessionsCompleted > 0) {
    insights.push(`${isCurrent ? 'You’ve completed' : 'You completed'} ${week.sessionsCompleted} of ${WEEKLY_SESSION_TARGET} sessions ${when}.`);
  } else if (isCurrent) {
    const next = nextPlannedSession(week, today);
    insights.push(next ? `Nothing logged yet this week. Your next planned session is ${next.slot.name} on ${WEEKDAY_NAMES[next.slot.weekday]}.` : 'Nothing logged yet this week.');
  } else {
    insights.push('No sessions were logged that week.');
  }
  if (week.minutes > 0) insights.push(`${isCurrent ? 'You’ve studied' : 'You studied'} for ${formatDurationLong(week.minutes)}.`);
  if (bestDay !== null) insights.push(`Your most consistent day is ${WEEKDAY_NAMES[bestDay]}.`);
  if (streak >= 2) insights.push(`You’ve kept your rhythm for ${streak} consecutive weeks.`);

  const onMark = (slot: PlannedSession, date: ISODate) => setForm({ mode: 'create', preset: { date, sessionKey: slot.key } });

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-tight text-ink sm:text-5xl">Consistency</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">Showing up, week by week. This is a way to see your rhythm, not a score to defend.</p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setForm({ mode: 'create' })}>
          <Plus className="size-4" aria-hidden="true" /> Log session
        </Button>
      </div>

      <section aria-label="Weekly target" className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-sage-200 bg-sage-50 px-5 py-3.5">
        <span className="font-serif text-lg text-ink">Weekly target</span>
        <span className="text-[15px] text-ink-soft">
          {WEEKLY_SESSION_TARGET} sessions, {WEEKLY_MINUTES_TARGET} minutes, {formatHours(WEEKLY_MINUTES_TARGET)} hours of study
        </span>
      </section>

      <section aria-labelledby="week-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <IconButton label="Previous week" onClick={() => shiftWeek(-1)}>
              <ChevronLeft className="size-5" aria-hidden="true" />
            </IconButton>
            <h2 id="week-heading" className="min-w-52 text-center text-xl text-ink">
              {formatWeekRange(weekStart)}
            </h2>
            <IconButton label="Next week" onClick={() => shiftWeek(1)} disabled={isCurrent}>
              <ChevronRight className="size-5" aria-hidden="true" />
            </IconButton>
          </div>
          {!isCurrent && (
            <Button size="sm" onClick={() => setWeekStart(currentWeek)}>
              Back to this week
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Tile label="Sessions completed" value={`${week.sessionsCompleted} / ${WEEKLY_SESSION_TARGET}`} meter={{ value: week.sessionsCompleted, max: WEEKLY_SESSION_TARGET }} />
          <Tile
            label="Study time"
            value={`${week.minutes} / ${WEEKLY_MINUTES_TARGET}`}
            unit="minutes"
            meter={{ value: week.minutes, max: WEEKLY_MINUTES_TARGET }}
            sub={week.minutes >= 60 ? formatDuration(week.minutes) : undefined}
          />
          <Tile label="Completion" value={`${week.percent}%`} sub="of the weekly session target" />
        </div>

        <WeekCalendar week={week} today={today} onMark={onMark} onEdit={(log) => setForm({ mode: 'edit', log })} />

        <div className="rounded-xl border border-line bg-surface px-5 py-4 shadow-soft">
          <h3 className="text-lg text-ink">Insights</h3>
          <ul className="mt-1.5 space-y-1 text-[15px] leading-relaxed text-ink-soft">
            {insights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {streak >= 2 && <p className="mt-2 text-xs text-muted">A week counts toward your rhythm when you complete {RHYTHM_THRESHOLD} or more sessions.</p>}
        </div>
      </section>

      <WeeklyHistory weeks={history} selected={weekStart} currentWeek={currentWeek} limit={historyLimit} onMore={() => setHistoryLimit((n) => n + 8)} onSelect={setWeekStart} />

      {form && (
        <SessionForm
          key={form.mode === 'edit' ? form.log.id : 'new'}
          log={form.mode === 'edit' ? form.log : undefined}
          preset={form.mode === 'create' ? form.preset : undefined}
          onSave={save}
          onDelete={form.mode === 'edit' ? () => setDeleteLog(form.log) : undefined}
          onClose={() => setForm(null)}
        />
      )}
      {deleteLog && (
        <ConfirmDialog
          title="Delete this session?"
          confirmLabel="Delete session"
          onCancel={() => setDeleteLog(null)}
          onConfirm={() => {
            deleteSession(deleteLog.id);
            setDeleteLog(null);
            setForm(null);
          }}
          message={
            <p>
              The log for “{deleteLog.sessionName}” on {formatLong(deleteLog.date)} will be removed. This cannot be undone.
            </p>
          }
        />
      )}
    </div>
  );
}
