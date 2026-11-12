import { describe, expect, it } from 'vitest';
import { BOX_INTERVAL_DAYS, createCard, editCard, isDue, reviewCard } from './srs';
import type { CardInput } from '../types';

const input: CardInput = {
  subject: 'math',
  questionType: '  Linear functions ',
  mistake: 'Used the wrong slope',
  trap: 'Reversed rise and run',
  rule: 'Slope is change in y over change in x.',
  nextTime: 'Label both points before subtracting.',
  notes: '',
};
const NOW = new Date(2026, 10, 9, 10, 0, 0);

describe('review intervals', () => {
  it('uses 2 days, 1 week, 3 weeks and 8 weeks', () => {
    expect(BOX_INTERVAL_DAYS).toEqual({ 1: 2, 2: 7, 3: 21, 4: 56 });
  });
});

describe('createCard', () => {
  it('starts in Box 1, due two days after it is created', () => {
    const card = createCard(input, '2026-11-09', NOW, 'c1');
    expect(card.box).toBe(1);
    expect(card.status).toBe('active');
    expect(card.dueDate).toBe('2026-11-11');
    expect(card.createdOn).toBe('2026-11-09');
    expect(card.history).toEqual([]);
    expect(card.questionType).toBe('Linear functions');
  });
});

describe('reviewCard', () => {
  it('climbs one box per success, scheduling from the review date, then masters the card', () => {
    let card = createCard(input, '2026-11-09', NOW, 'c1');

    card = reviewCard(card, true, '2026-11-11', NOW, 'r1');
    expect([card.box, card.dueDate, card.status]).toEqual([2, '2026-11-18', 'active']);

    card = reviewCard(card, true, '2026-11-18', NOW, 'r2');
    expect([card.box, card.dueDate]).toEqual([3, '2026-12-09']);

    card = reviewCard(card, true, '2026-12-09', NOW, 'r3');
    expect([card.box, card.dueDate]).toEqual([4, '2027-02-03']);

    card = reviewCard(card, true, '2027-02-03', NOW, 'r4');
    expect(card.status).toBe('mastered');
    expect(card.dueDate).toBeNull();
    expect(card.masteredAt).toBe(NOW.toISOString());
    expect(card.history.map((h) => h.toBox)).toEqual([2, 3, 4, 'mastered']);
    expect(isDue(card, '2030-01-01')).toBe(false);
  });

  it('returns a missed card to Box 1, due in 2 days, and keeps its history', () => {
    let card = createCard(input, '2026-11-09', NOW, 'c1');
    card = reviewCard(card, true, '2026-11-11', NOW, 'r1');
    card = reviewCard(card, true, '2026-11-18', NOW, 'r2');
    card = reviewCard(card, false, '2026-12-09', NOW, 'r3');
    expect([card.box, card.dueDate, card.status]).toEqual([1, '2026-12-11', 'active']);
    expect(card.history).toHaveLength(3);
    expect(card.history[2]).toMatchObject({ success: false, fromBox: 3, toBox: 1, nextDue: '2026-12-11' });
  });

  it('schedules a late review from the day it actually happens', () => {
    const card = createCard(input, '2026-11-09', NOW, 'c1'); // due 2026-11-11
    const reviewed = reviewCard(card, true, '2026-11-20', NOW, 'r1');
    expect(reviewed.dueDate).toBe('2026-11-27'); // 2026-11-20 + 7 days
  });

  it('lets a mastered card be reviewed again: success keeps it mastered, a miss restarts it', () => {
    let card = createCard(input, '2026-11-09', NOW, 'c1');
    card = { ...card, box: 4, status: 'mastered', dueDate: null, masteredAt: '2027-02-03T10:00:00.000Z' };

    const kept = reviewCard(card, true, '2027-06-01', NOW, 'r1');
    expect([kept.status, kept.dueDate, kept.masteredAt]).toEqual(['mastered', null, '2027-02-03T10:00:00.000Z']);

    const restarted = reviewCard(card, false, '2027-06-01', NOW, 'r2');
    expect([restarted.status, restarted.box, restarted.dueDate, restarted.masteredAt]).toEqual(['active', 1, '2027-06-03', null]);
  });

  it('does not mutate the card it was given', () => {
    const card = createCard(input, '2026-11-09', NOW, 'c1');
    const snapshot = JSON.stringify(card);
    reviewCard(card, true, '2026-11-11', NOW, 'r1');
    expect(JSON.stringify(card)).toBe(snapshot);
  });
});

describe('isDue and editCard', () => {
  it('is due on the due date and after, not before', () => {
    const card = createCard(input, '2026-11-09', NOW, 'c1'); // due 2026-11-11
    expect(isDue(card, '2026-11-10')).toBe(false);
    expect(isDue(card, '2026-11-11')).toBe(true);
    expect(isDue(card, '2026-12-01')).toBe(true);
  });

  it('editing the wording leaves the schedule alone', () => {
    const card = reviewCard(createCard(input, '2026-11-09', NOW, 'c1'), true, '2026-11-11', NOW, 'r1');
    const edited = editCard(card, { ...input, rule: 'A new rule.' });
    expect(edited.rule).toBe('A new rule.');
    expect([edited.box, edited.dueDate, edited.history.length]).toEqual([2, '2026-11-18', 1]);
  });
});
