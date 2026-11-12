import { diffDays, type ISODate } from './dates';
import { plural, SUBJECT_LABEL } from './format';
import { isDue } from './srs';
import type { Box, LedgerCard } from '../types';

export type CardFilter = 'all' | 'due' | 'upcoming' | 'math' | 'rw' | 'mastered';
export type CardSort = 'due' | 'newest' | 'oldest';

export interface LedgerStats {
  active: number;
  due: number;
  mastered: number;
  byBox: Record<Box, number>;
}

export function ledgerStats(cards: LedgerCard[], today: ISODate): LedgerStats {
  const byBox: Record<Box, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let active = 0;
  let due = 0;
  let mastered = 0;
  for (const card of cards) {
    if (card.status === 'mastered') {
      mastered += 1;
      continue;
    }
    active += 1;
    byBox[card.box] += 1;
    if (isDue(card, today)) due += 1;
  }
  return { active, due, mastered, byBox };
}

export function matchesQuery(card: LedgerCard, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = [card.questionType, card.mistake, card.trap, card.rule, card.nextTime, card.notes, SUBJECT_LABEL[card.subject]]
    .join(' ')
    .toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function filterCards(cards: LedgerCard[], filter: CardFilter, query: string, today: ISODate): LedgerCard[] {
  return cards.filter((card) => {
    if (!matchesQuery(card, query)) return false;
    switch (filter) {
      case 'due':
        return isDue(card, today);
      case 'upcoming':
        return card.status === 'active' && card.dueDate !== null && card.dueDate > today;
      case 'math':
        return card.subject === 'math';
      case 'rw':
        return card.subject === 'rw';
      case 'mastered':
        return card.status === 'mastered';
      default:
        return true;
    }
  });
}

export function sortCards(cards: LedgerCard[], sort: CardSort): LedgerCard[] {
  const list = [...cards];
  if (sort === 'newest') return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === 'oldest') return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const rank = (c: LedgerCard) => (c.status === 'mastered' ? 1 : 0);
  return list.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (a.dueDate ?? '').localeCompare(b.dueDate ?? '') ||
      (b.masteredAt ?? '').localeCompare(a.masteredAt ?? '') ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

/** The soonest upcoming review date, and how many cards share it. */
export function nextDueInfo(cards: LedgerCard[], today: ISODate): { date: ISODate; count: number } | null {
  let date: ISODate | null = null;
  let count = 0;
  for (const card of cards) {
    if (card.status !== 'active' || card.dueDate === null || card.dueDate <= today) continue;
    if (date === null || card.dueDate < date) {
      date = card.dueDate;
      count = 1;
    } else if (card.dueDate === date) {
      count += 1;
    }
  }
  return date === null ? null : { date, count };
}

export interface DueInfo {
  text: string;
  tone: 'overdue' | 'due' | 'upcoming' | 'mastered';
}

export function dueInfo(card: LedgerCard, today: ISODate): DueInfo {
  if (card.status === 'mastered' || card.dueDate === null) return { text: 'Mastered', tone: 'mastered' };
  const days = diffDays(card.dueDate, today);
  if (days < 0) return { text: `Overdue by ${plural(-days, 'day')}`, tone: 'overdue' };
  if (days === 0) return { text: 'Due today', tone: 'due' };
  if (days === 1) return { text: 'Due tomorrow', tone: 'upcoming' };
  return { text: `Due in ${plural(days, 'day')}`, tone: 'upcoming' };
}

export function filterCounts(cards: LedgerCard[], today: ISODate): Record<CardFilter, number> {
  const counts: Record<CardFilter, number> = { all: cards.length, due: 0, upcoming: 0, math: 0, rw: 0, mastered: 0 };
  for (const card of cards) {
    if (isDue(card, today)) counts.due += 1;
    else if (card.status === 'active') counts.upcoming += 1;
    if (card.subject === 'math') counts.math += 1;
    else counts.rw += 1;
    if (card.status === 'mastered') counts.mastered += 1;
  }
  return counts;
}
