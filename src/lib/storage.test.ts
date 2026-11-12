import { describe, expect, it } from 'vitest';
import { buildBackup, emptyData, loadFromStorage, parseBackup, saveToStorage, STORAGE_KEY, UNREADABLE_BACKUP_KEY, validateAppData } from './storage';
import { createCard, reviewCard } from './srs';
import type { AppData } from '../types';

const NOW = new Date(2026, 10, 9, 10);

function sample(): AppData {
  let card = createCard(
    { subject: 'math', questionType: 'Linear functions', mistake: 'Wrong slope', trap: 'Reversed rise and run', rule: 'Slope is rise over run.', nextTime: 'Label points.', notes: 'Retry p.4' },
    '2026-11-09',
    NOW,
    'card-1',
  );
  card = reviewCard(card, true, '2026-11-11', NOW, 'rev-1');
  return {
    cards: [card],
    sessions: [
      { id: 's1', date: '2026-11-09', sessionKey: 'mon', sessionName: 'Math Foundations', plannedMinutes: 30, actualMinutes: 35, completed: true, notes: '', createdAt: NOW.toISOString() },
    ],
    settings: { lastExportAt: null },
  };
}

describe('localStorage persistence', () => {
  it('saves and loads without losing cards, review history or study logs', () => {
    expect(saveToStorage(sample())).toEqual({ ok: true });
    const loaded = loadFromStorage();
    expect(loaded.status).toBe('ok');
    expect(loaded.data).toEqual(sample());
  });

  it('starts empty when nothing is stored', () => {
    expect(loadFromStorage()).toEqual({ data: emptyData(), status: 'empty', notice: null });
  });

  it('keeps a copy of unreadable data instead of silently discarding it', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    const loaded = loadFromStorage();
    expect(loaded.status).toBe('unreadable');
    expect(loaded.data).toEqual(emptyData());
    expect(window.localStorage.getItem(UNREADABLE_BACKUP_KEY)).toBe('{not json');
  });
});

describe('import validation', () => {
  it('round-trips an export exactly', () => {
    const backup = buildBackup(sample(), NOW);
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.cards).toEqual(sample().cards);
      expect(parsed.data.sessions).toEqual(sample().sessions);
      expect(parsed.exportedAt).toBe(NOW.toISOString());
    }
  });

  it('rejects files that are not valid JSON or not from this app', () => {
    expect(parseBackup('hello').ok).toBe(false);
    expect(parseBackup('[]').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'something-else', data: sample() })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ app: 'sat-error-ledger', schemaVersion: 99, data: sample() })).ok).toBe(false);
  });

  it('rejects data with problems and explains what is wrong', () => {
    const data = sample();
    const bad = JSON.parse(JSON.stringify(data));
    bad.cards[0].box = 9;
    bad.cards[0].dueDate = 'tomorrow';
    bad.sessions[0].actualMinutes = -5;
    const result = validateAppData(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.total).toBe(3);
      expect(result.errors.join(' ')).toMatch(/box must be 1, 2, 3 or 4/);
      expect(result.errors.join(' ')).toMatch(/dueDate/);
      expect(result.errors.join(' ')).toMatch(/actualMinutes/);
    }
  });

  it('rejects duplicate ids, missing fields and inconsistent status', () => {
    const data = sample();
    expect(validateAppData({ ...data, cards: [data.cards[0], data.cards[0]] }).ok).toBe(false);
    expect(validateAppData({ cards: data.cards }).ok).toBe(false);
    const mastered = JSON.parse(JSON.stringify(data));
    mastered.cards[0].status = 'mastered'; // but dueDate is still set
    expect(validateAppData(mastered).ok).toBe(false);
  });

  it('strips unknown fields so nothing unexpected is stored', () => {
    const polluted = JSON.parse(JSON.stringify(sample()));
    polluted.cards[0].extra = 'surprise';
    const result = validateAppData(polluted);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.cards[0]).not.toHaveProperty('extra');
  });
});
