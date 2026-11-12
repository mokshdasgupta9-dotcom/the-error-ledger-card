import { BOXES, BOX_INTERVAL_LABEL } from '../../lib/srs';
import type { LedgerStats } from '../../lib/ledger';
import { cx } from '../ui';

function Stat({ label, sub, value, accent }: { label: string; sub?: string; value: number; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={cx('font-serif text-[1.75rem] leading-tight tabular-nums', accent ? 'text-forest-700' : 'text-ink')}>{value}</dd>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function StatsStrip({ stats }: { stats: LedgerStats }) {
  return (
    <section aria-label="Ledger summary" className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <dl className="flex items-start justify-between gap-4 rounded-xl border border-line bg-surface px-5 py-4 shadow-soft">
        <Stat label="Active cards" value={stats.active} />
        <Stat label="Due today" value={stats.due} accent={stats.due > 0} />
        <Stat label="Mastered" value={stats.mastered} />
      </dl>
      <dl className="grid grid-cols-4 divide-x divide-line rounded-xl border border-line bg-surface py-4 shadow-soft">
        {BOXES.map((box) => (
          <div key={box} className="min-w-0 px-4 first:pl-5">
            <Stat label={`Box ${box}`} sub={`every ${BOX_INTERVAL_LABEL[box]}`} value={stats.byBox[box]} />
          </div>
        ))}
      </dl>
    </section>
  );
}
