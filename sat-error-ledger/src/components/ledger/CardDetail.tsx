import { Pencil, Trash2 } from 'lucide-react';
import { diffDays, formatLong, formatShort } from '../../lib/dates';
import { plural, SUBJECT_LABEL } from '../../lib/format';
import { dueInfo } from '../../lib/ledger';
import { BOX_INTERVAL_LABEL, isDue } from '../../lib/srs';
import { useLedger } from '../../state/ledger-context';
import type { LedgerCard, ReviewEntry } from '../../types';
import { Badge, Button, Modal } from '../ui';

function Block({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

const outcome = (e: ReviewEntry) => (!e.success ? 'Back to Box 1' : e.toBox === 'mastered' ? 'Mastered' : `Moved to Box ${e.toBox}`);

export function CardDetail({
  card,
  onClose,
  onEdit,
  onDelete,
  onReview,
}: {
  card: LedgerCard;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReview: () => void;
}) {
  const { today } = useLedger();
  const info = dueInfo(card, today);
  const canReview = card.status === 'mastered' || isDue(card, today);
  const history = [...card.history].reverse();

  return (
    <Modal
      title={card.questionType}
      description={`Added ${formatLong(card.createdOn)}`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="danger" onClick={onDelete} className="mr-auto">
            <Trash2 className="size-4" aria-hidden="true" /> Delete
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="size-4" aria-hidden="true" /> Edit
          </Button>
          {canReview && (
            <Button variant="primary" onClick={onReview}>
              {card.status === 'mastered' ? 'Review again' : 'Review now'}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5 pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="sage">{SUBJECT_LABEL[card.subject]}</Badge>
          {card.status === 'mastered' ? (
            <Badge tone="forest">Mastered</Badge>
          ) : (
            <>
              <Badge>
                Box {card.box}, every {BOX_INTERVAL_LABEL[card.box]}
              </Badge>
              <span className={info.tone === 'overdue' ? 'text-[13px] text-berry-600' : 'text-[13px] text-muted'}>
                {info.text}
                {card.dueDate ? `, ${formatShort(card.dueDate)}` : ''}
              </span>
            </>
          )}
        </div>

        <Block label="My mistake">{card.mistake}</Block>
        <Block label="The trap">{card.trap}</Block>
        <Block label="The rule">{card.rule}</Block>
        <Block label="Next time">{card.nextTime}</Block>
        {card.notes && <Block label="Notes">{card.notes}</Block>}

        <section aria-labelledby="history-heading" className="border-t border-line pt-4">
          <h3 id="history-heading" className="text-lg text-ink">
            Review history
          </h3>
          {history.length === 0 ? (
            <p className="mt-1 text-sm text-muted">
              No reviews yet. The first one is {card.dueDate ? formatShort(card.dueDate) : 'on its way'}.
            </p>
          ) : (
            <ol className="mt-2 space-y-1.5">
              {history.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="w-28 shrink-0 text-muted">{formatShort(entry.reviewedOn)}</span>
                  <span className={entry.success ? 'font-medium text-forest-700' : 'font-medium text-berry-600'}>{outcome(entry)}</span>
                  <span className="text-muted">
                    {entry.nextDue ? `next ${formatShort(entry.nextDue)}, in ${plural(diffDays(entry.nextDue, entry.reviewedOn), 'day')}` : 'archived'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Modal>
  );
}
