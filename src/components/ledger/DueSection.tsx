import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { formatShort, type ISODate } from '../../lib/dates';
import { plural, SUBJECT_LABEL } from '../../lib/format';
import { dueInfo } from '../../lib/ledger';
import { BOX_INTERVAL_LABEL } from '../../lib/srs';
import type { LedgerCard } from '../../types';
import { Badge, Button, cx } from '../ui';

const PREVIEW = 4;

function Block({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="line-clamp-3 text-[15px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

function DueCardRow({ card, today, onReview }: { card: LedgerCard; today: ISODate; onReview: (id: string) => void }) {
  const info = dueInfo(card, today);
  return (
    <li className="grid gap-x-8 gap-y-4 px-5 py-5 sm:grid-cols-[13.5rem_minmax(0,1fr)]">
      <div className="space-y-2">
        <Badge tone="sage">{SUBJECT_LABEL[card.subject]}</Badge>
        <h3 className="font-serif text-lg leading-snug text-ink">{card.questionType}</h3>
        <dl className="space-y-0.5 text-[13px] text-muted">
          <div>
            <dt className="sr-only">Review stage</dt>
            <dd>
              Box {card.box}, every {BOX_INTERVAL_LABEL[card.box]}
            </dd>
          </div>
          <div>
            <dt className="sr-only">Due date</dt>
            <dd className={cx(info.tone === 'overdue' && 'text-berry-600')}>
              {info.text}, {card.dueDate ? formatShort(card.dueDate) : ''}
            </dd>
          </div>
        </dl>
        <Button variant="primary" size="sm" aria-label={`Review ${card.questionType}`} onClick={() => onReview(card.id)}>
          Review
        </Button>
      </div>
      <div className="min-w-0 space-y-3">
        <Block label="My mistake">{card.mistake}</Block>
        <Block label="The trap">{card.trap}</Block>
        <div>
          <p className="text-xs font-medium text-muted">The lesson</p>
          <p aria-hidden="true" className="line-clamp-2 select-none text-[15px] leading-relaxed text-ink blur-[5px]">
            {card.rule}
          </p>
          <p className="sr-only">Hidden until you review this card, so you can try to recall it first.</p>
        </div>
      </div>
    </li>
  );
}

export function DueSection({
  due,
  nextDue,
  today,
  onReview,
}: {
  due: LedgerCard[];
  nextDue: { date: ISODate; count: number } | null;
  today: ISODate;
  onReview: (ids: string[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? due : due.slice(0, PREVIEW);

  return (
    <section aria-labelledby="due-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="due-heading" className="text-2xl text-ink">
            Due for Review
          </h2>
          <p className="mt-0.5 text-sm text-muted">{due.length ? `${plural(due.length, 'card')} ready for review.` : 'Nothing is waiting for you.'}</p>
        </div>
        {due.length > 0 && (
          <Button variant="primary" onClick={() => onReview(due.map((c) => c.id))}>
            Review all {due.length}
          </Button>
        )}
      </div>

      {due.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-5 py-5 text-sm text-ink-soft">
          <CircleCheck className="size-5 shrink-0 text-forest-600" aria-hidden="true" />
          <p>{nextDue ? `All caught up. The next review is ${formatShort(nextDue.date)} (${plural(nextDue.count, 'card')}).` : 'All caught up. New cards come due two days after you create them.'}</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
          {shown.map((card) => (
            <DueCardRow key={card.id} card={card} today={today} onReview={(id) => onReview([id])} />
          ))}
        </ul>
      )}

      {due.length > PREVIEW && (
        <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show fewer' : `Show all ${due.length} due cards`}
        </Button>
      )}
    </section>
  );
}
