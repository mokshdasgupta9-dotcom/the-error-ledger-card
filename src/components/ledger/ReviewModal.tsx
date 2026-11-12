import { useState, type ReactNode } from 'react';
import { diffDays, formatLong } from '../../lib/dates';
import { plural, SUBJECT_LABEL } from '../../lib/format';
import { dueInfo } from '../../lib/ledger';
import { BOX_INTERVAL_LABEL } from '../../lib/srs';
import { useLedger } from '../../state/ledger-context';
import { Badge, Button, Modal } from '../ui';

type Phase = 'recall' | 'revealed' | 'result';

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed text-ink">{children}</p>
    </div>
  );
}

/**
 * A focused review. The lesson stays hidden until the person reveals it, and the outcome is only
 * recorded when they explicitly say whether they recalled it.
 */
export function ReviewModal({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { data, today, review } = useLedger();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('recall');
  const [tally, setTally] = useState({ recalled: 0, missed: 0 });

  const card = data.cards.find((c) => c.id === ids[index]);
  if (!card) return null;

  const total = ids.length;
  const isLast = index >= total - 1;
  const entry = card.history[card.history.length - 1];
  const info = dueInfo(card, today);

  const answer = (success: boolean) => {
    review(card.id, success);
    setTally((t) => ({ recalled: t.recalled + (success ? 1 : 0), missed: t.missed + (success ? 0 : 1) }));
    setPhase('result');
  };
  const next = () => {
    if (isLast) {
      onClose();
      return;
    }
    setIndex((i) => i + 1);
    setPhase('recall');
  };

  let footer: ReactNode;
  if (phase === 'recall') {
    footer = (
      <>
        {total > 1 && (
          <Button key="skip" variant="ghost" onClick={next}>
            Skip for now
          </Button>
        )}
        <Button key="reveal" variant="primary" autoFocus onClick={() => setPhase('revealed')}>
          Reveal the lesson
        </Button>
      </>
    );
  } else if (phase === 'revealed') {
    footer = (
      <>
        <Button key="miss" onClick={() => answer(false)}>
          I didn’t recall it
        </Button>
        <Button key="hit" variant="primary" autoFocus onClick={() => answer(true)}>
          I recalled it
        </Button>
      </>
    );
  } else {
    footer = (
      <Button key="next" variant="primary" autoFocus onClick={next}>
        {isLast ? 'Done' : 'Next card'}
      </Button>
    );
  }

  return (
    <Modal
      title="Review"
      description={total > 1 ? `Card ${index + 1} of ${total}` : undefined}
      size="lg"
      onClose={onClose}
      dismissOnBackdrop={false}
      footer={footer}
    >
      {phase !== 'result' && (
        <div className="space-y-5 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="sage">{SUBJECT_LABEL[card.subject]}</Badge>
            <Badge>Box {card.box}</Badge>
            <span className="text-[13px] text-muted">{info.text}</span>
          </div>
          <h3 className="text-2xl leading-snug text-ink">{card.questionType}</h3>
          <Block label="My mistake">{card.mistake}</Block>
          <Block label="The trap">{card.trap}</Block>

          {phase === 'recall' ? (
            <p className="rounded-lg bg-sage-50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
              Before you reveal it, try to recall the one-sentence lesson. Say it out loud or jot it down.
            </p>
          ) : (
            <>
              <section aria-label="The lesson" className="animate-pop space-y-3 rounded-xl border border-sage-200 bg-sage-50 px-5 py-4">
                <div>
                  <p className="text-xs font-medium text-forest-700">The rule</p>
                  <p className="mt-1 font-serif text-xl leading-snug text-ink">{card.rule}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-forest-700">Next time</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{card.nextTime}</p>
                </div>
                {card.notes && (
                  <div>
                    <p className="text-xs font-medium text-forest-700">Notes</p>
                    <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{card.notes}</p>
                  </div>
                )}
              </section>
              <p className="text-sm leading-relaxed text-muted">
                Did you recall the rule before revealing it? Be honest: a miss is useful, and the card simply comes back in 2 days.
              </p>
            </>
          )}
        </div>
      )}

      {phase === 'result' && entry && (
        <div role="status" aria-live="polite" className="space-y-4 pt-3">
          <h3 className="text-3xl leading-tight text-ink">
            {entry.success ? (entry.toBox === 'mastered' ? 'Mastered.' : `Moved to Box ${entry.toBox}.`) : 'Back to Box 1.'}
          </h3>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            {entry.success
              ? entry.toBox === 'mastered'
                ? 'You have recalled this lesson after every wait, including the 8 weeks in Box 4.'
                : `Recalled. It now waits ${BOX_INTERVAL_LABEL[entry.toBox as 2 | 3 | 4]} before it comes back.`
              : 'No problem. Seeing it again soon is how it sticks. It returns in 2 days.'}
          </p>
          {entry.nextDue ? (
            <p className="rounded-lg border border-line bg-white px-4 py-3 text-[15px] text-ink">
              <span className="text-muted">Next review: </span>
              <strong className="font-medium">{formatLong(entry.nextDue)}</strong>
              <span className="text-muted"> (in {plural(diffDays(entry.nextDue, today), 'day')})</span>
            </p>
          ) : (
            <p className="rounded-lg border border-line bg-white px-4 py-3 text-[15px] text-ink">
              This card now lives in the Mastered archive. You can review it again whenever you like.
            </p>
          )}
          {isLast && total > 1 && (
            <p className="text-sm text-muted">
              Session complete: {tally.recalled} recalled, {tally.missed} to revisit.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
