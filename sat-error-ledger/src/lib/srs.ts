import { addDays, type ISODate } from './dates';
import type { Box, CardInput, LedgerCard, ReviewEntry } from '../types';

export const BOXES: readonly Box[] = [1, 2, 3, 4];

/** The review system: how long a card waits in each box before it is due again. */
export const BOX_INTERVAL_DAYS: Record<Box, number> = { 1: 2, 2: 7, 3: 21, 4: 56 };
export const BOX_INTERVAL_LABEL: Record<Box, string> = { 1: '2 days', 2: '1 week', 3: '3 weeks', 4: '8 weeks' };

export const cleanInput = (i: CardInput): CardInput => ({
  subject: i.subject,
  questionType: i.questionType.trim(),
  mistake: i.mistake.trim(),
  trap: i.trap.trim(),
  rule: i.rule.trim(),
  nextTime: i.nextTime.trim(),
  notes: i.notes.trim(),
});

/** A new card always starts in Box 1 and is first due two days after it is created. */
export function createCard(input: CardInput, today: ISODate, now: Date, id: string): LedgerCard {
  return {
    ...cleanInput(input),
    id,
    createdAt: now.toISOString(),
    createdOn: today,
    box: 1,
    status: 'active',
    dueDate: addDays(today, BOX_INTERVAL_DAYS[1]),
    masteredAt: null,
    history: [],
  };
}

/** Editing the wording of a card never changes its schedule or history. */
export const editCard = (card: LedgerCard, input: CardInput): LedgerCard => ({ ...card, ...cleanInput(input) });

export const isDue = (card: LedgerCard, today: ISODate): boolean =>
  card.status === 'active' && card.dueDate !== null && card.dueDate <= today;

/**
 * Applies one review. The person decides whether they recalled the lesson; nothing here guesses.
 *  - Success moves the card up one box and schedules it from today using that box's interval.
 *  - Success in Box 4 (or on an already mastered card) means Mastered.
 *  - A miss always returns the card to Box 1, due in 2 days.
 * Every review is appended to the card's history.
 */
export function reviewCard(card: LedgerCard, success: boolean, today: ISODate, now: Date, entryId: string): LedgerCard {
  const nowIso = now.toISOString();
  let next: Pick<LedgerCard, 'box' | 'status' | 'dueDate' | 'masteredAt'>;
  let toBox: ReviewEntry['toBox'];

  if (!success) {
    next = { box: 1, status: 'active', dueDate: addDays(today, BOX_INTERVAL_DAYS[1]), masteredAt: null };
    toBox = 1;
  } else if (card.status === 'mastered') {
    next = { box: 4, status: 'mastered', dueDate: null, masteredAt: card.masteredAt ?? nowIso };
    toBox = 'mastered';
  } else if (card.box === 4) {
    next = { box: 4, status: 'mastered', dueDate: null, masteredAt: nowIso };
    toBox = 'mastered';
  } else {
    const box = (card.box + 1) as Box;
    next = { box, status: 'active', dueDate: addDays(today, BOX_INTERVAL_DAYS[box]), masteredAt: null };
    toBox = box;
  }

  const entry: ReviewEntry = {
    id: entryId,
    reviewedOn: today,
    reviewedAt: nowIso,
    fromBox: card.box,
    toBox,
    success,
    nextDue: next.dueDate,
  };
  return { ...card, ...next, history: [...card.history, entry] };
}
