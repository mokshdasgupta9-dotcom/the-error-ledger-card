import { describe, expect, it } from 'vitest';
import { dueInfo, filterCards, filterCounts, ledgerStats, matchesQuery, nextDueInfo, sortCards } from './ledger';
import { createCard, reviewCard } from './srs';
import type { CardInput, LedgerCard } from '../types';

const base: CardInput = { subject: 'math', questionType: 'Linear functions', mistake: 'Wrong slope', trap: 'Reversed rise and run', rule: 'Slope is rise over run.', nextTime: 'Label points.', notes: '' };
const NOW = new Date(2026, 10, 9, 10);
const make = (id: string, created: string, over: Partial<CardInput> = {}) => createCard({ ...base, ...over }, created, new Date(`${created}T12:00:00`), id);

const TODAY = '2026-11-09';
const overdue = make('a', '2026-11-03'); // due 11-05
const dueToday = make('b', '2026-11-07', { subject: 'rw', questionType: 'Words in Context', rule: 'Test each choice in the sentence.' }); // due 11-09
const upcoming = make('c', '2026-11-08'); // due 11-10
const later = reviewCard(make('d', '2026-11-01'), true, '2026-11-03', NOW, 'r'); // box 2, due 11-10
let mastered: LedgerCard = make('e', '2026-08-01', { subject: 'rw', questionType: 'Transitions' });
mastered = { ...mastered, box: 4, status: 'mastered', dueDate: null, masteredAt: '2026-10-01T10:00:00.000Z' };
const cards = [overdue, dueToday, upcoming, later, mastered];

describe('ledger stats', () => {
  it('counts active, due, mastered and cards per box', () => {
    expect(ledgerStats(cards, TODAY)).toEqual({ active: 4, due: 2, mastered: 1, byBox: { 1: 3, 2: 1, 3: 0, 4: 0 } });
  });
});

describe('filters and search', () => {
  it('filters by due, upcoming, subject and mastered', () => {
    const ids = (filter: Parameters<typeof filterCards>[1]) => filterCards(cards, filter, '', TODAY).map((c) => c.id).sort();
    expect(ids('all')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(ids('due')).toEqual(['a', 'b']);
    expect(ids('upcoming')).toEqual(['c', 'd']);
    expect(ids('math')).toEqual(['a', 'c', 'd']);
    expect(ids('rw')).toEqual(['b', 'e']);
    expect(ids('mastered')).toEqual(['e']);
    expect(filterCounts(cards, TODAY)).toEqual({ all: 5, due: 2, upcoming: 2, math: 3, rw: 2, mastered: 1 });
  });

  it('searches question type and card content, case-insensitively, requiring every word', () => {
    expect(matchesQuery(dueToday, 'words context')).toBe(true);
    expect(matchesQuery(dueToday, 'SENTENCE')).toBe(true);
    expect(matchesQuery(dueToday, 'words fraction')).toBe(false);
    expect(filterCards(cards, 'all', 'transitions', TODAY).map((c) => c.id)).toEqual(['e']);
    expect(filterCards(cards, 'math', 'words', TODAY)).toEqual([]);
  });
});

describe('sorting and due text', () => {
  it('sorts by due date with mastered cards last, or by creation date', () => {
    // c and d share a due date, so the card created first (d) comes first
    expect(sortCards(cards, 'due').map((c) => c.id)).toEqual(['a', 'b', 'd', 'c', 'e']);
    expect(sortCards(cards, 'newest').map((c) => c.id)[0]).toBe('c');
    expect(sortCards(cards, 'oldest').map((c) => c.id)[0]).toBe('e');
  });

  it('finds the next upcoming review date', () => {
    expect(nextDueInfo(cards, TODAY)).toEqual({ date: '2026-11-10', count: 2 });
    expect(nextDueInfo([mastered], TODAY)).toBeNull();
  });

  it('describes due dates plainly', () => {
    expect(dueInfo(overdue, TODAY)).toEqual({ text: 'Overdue by 4 days', tone: 'overdue' });
    expect(dueInfo(dueToday, TODAY)).toEqual({ text: 'Due today', tone: 'due' });
    expect(dueInfo(upcoming, TODAY)).toEqual({ text: 'Due tomorrow', tone: 'upcoming' });
    expect(dueInfo(mastered, TODAY)).toEqual({ text: 'Mastered', tone: 'mastered' });
  });
});
