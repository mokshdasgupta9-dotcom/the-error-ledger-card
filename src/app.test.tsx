import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { formatLong, formatShort, formatWeekRange } from './lib/dates';
import { readFileText } from './lib/files';
import { createCard } from './lib/srs';
import { buildBackup, emptyData, loadFromStorage, parseBackup, saveToStorage } from './lib/storage';
import type { LedgerCard, SessionLog } from './types';

const TODAY = '2026-11-09'; // a Monday
const RULE = 'Slope is change in y over change in x.';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 9, 10, 0, 0));
});
afterEach(() => {
  vi.useRealTimers();
});

/** A card that is due today (created two days ago). */
function dueCard(over: Partial<LedgerCard> = {}, id = 'card-1', questionType = 'Linear functions'): LedgerCard {
  const card = createCard(
    { subject: 'math', questionType, mistake: 'Used the wrong slope', trap: 'Reversed rise and run', rule: RULE, nextTime: 'Label both points first.', notes: '' },
    '2026-11-07',
    new Date(2026, 10, 7, 9),
    id,
  );
  return { ...card, ...over };
}

const session = (over: Partial<SessionLog> & Pick<SessionLog, 'id' | 'date'>): SessionLog => ({
  sessionKey: 'mon',
  sessionName: 'Math Foundations',
  plannedMinutes: 30,
  actualMinutes: 30,
  completed: true,
  notes: '',
  createdAt: '2026-11-09T10:00:00.000Z',
  ...over,
});

const seed = (cards: LedgerCard[] = [], sessions: SessionLog[] = []) => void saveToStorage({ ...emptyData(), cards, sessions });
const stored = () => loadFromStorage().data;
const travelTo = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  vi.setSystemTime(new Date(y, m - 1, d, 10));
  act(() => {
    window.dispatchEvent(new Event('focus'));
  });
};

type User = ReturnType<typeof userEvent.setup>;

async function addCardViaForm(user: User, questionType = 'Linear functions') {
  await user.click(screen.getByRole('button', { name: /^new card$/i }));
  const dialog = await screen.findByRole('dialog', { name: /new card/i });
  await user.type(within(dialog).getByLabelText(/question type/i), questionType);
  await user.type(within(dialog).getByLabelText(/my mistake/i), 'Used the wrong slope');
  await user.type(within(dialog).getByLabelText(/the trap/i), 'Reversed rise and run');
  await user.type(within(dialog).getByLabelText(/the rule/i), RULE);
  await user.type(within(dialog).getByLabelText(/next time/i), 'Label both points first.');
  await user.click(within(dialog).getByRole('button', { name: /^add card$/i }));
}

describe('Error Ledger: creating cards', () => {
  it('shows a welcoming empty state before any cards exist', () => {
    render(<App />);
    expect(screen.getByText('Your ledger is empty')).toBeTruthy();
  });

  it('creates a card in Box 1 that is first due two days later', async () => {
    const user = userEvent.setup();
    render(<App />);
    await addCardViaForm(user);

    expect(await screen.findByText(/added “linear functions” to box 1/i)).toBeTruthy();
    await waitFor(() => expect(stored().cards).toHaveLength(1));
    const card = stored().cards[0];
    expect([card.box, card.status, card.dueDate, card.createdOn]).toEqual([1, 'active', '2026-11-11', TODAY]);
    // the date appears in the confirmation banner and in the "next review" note
    expect(screen.getAllByText(new RegExp(formatShort('2026-11-11'))).length).toBeGreaterThan(0);
  });

  it('asks for every required field and saves nothing until they are filled', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^new card$/i }));
    const dialog = await screen.findByRole('dialog', { name: /new card/i });
    await user.click(within(dialog).getByRole('button', { name: /^add card$/i }));
    expect(within(dialog).getAllByRole('alert')).toHaveLength(5);
    expect(stored().cards).toHaveLength(0);
  });

  it('keeps the dialog open and the subject when you save and add another', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^new card$/i }));
    const dialog = await screen.findByRole('dialog', { name: /new card/i });
    await user.click(within(dialog).getByLabelText('Reading & Writing'));
    await user.type(within(dialog).getByLabelText(/question type/i), 'Words in Context');
    await user.type(within(dialog).getByLabelText(/my mistake/i), 'Picked the common meaning');
    await user.type(within(dialog).getByLabelText(/the trap/i), 'A familiar definition');
    await user.type(within(dialog).getByLabelText(/the rule/i), 'Test every choice in the sentence.');
    await user.type(within(dialog).getByLabelText(/next time/i), 'Substitute before choosing.');
    await user.click(within(dialog).getByRole('button', { name: /save and add another/i }));
    await waitFor(() => expect(stored().cards).toHaveLength(1));
    expect((within(dialog).getByLabelText(/question type/i) as HTMLInputElement).value).toBe('');
    expect((within(dialog).getByLabelText('Reading & Writing') as HTMLInputElement).checked).toBe(true);
    expect(stored().cards[0].subject).toBe('rw');
  });
});

describe('Error Ledger: reviewing', () => {
  const openReview = async (user: User) => {
    await user.click(await screen.findByRole('button', { name: 'Review Linear functions' }));
    return screen.findByRole('dialog', { name: /review/i });
  };

  it('surfaces due cards and keeps the lesson hidden until you reveal it and choose an outcome', async () => {
    seed([dueCard()]);
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Due for Review' })).toBeTruthy();

    const dialog = await openReview(user);
    expect(within(dialog).queryByText(RULE)).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /i recalled it/i })).toBeNull();

    await user.click(within(dialog).getByRole('button', { name: /reveal the lesson/i }));
    expect(within(dialog).getByText(RULE)).toBeTruthy();
    expect(stored().cards[0].history).toHaveLength(0); // nothing is recorded until you choose

    await user.click(within(dialog).getByRole('button', { name: /i recalled it/i }));
    expect(await within(dialog).findByText('Moved to Box 2.')).toBeTruthy();
    expect(within(dialog).getByText(formatLong('2026-11-16'))).toBeTruthy();
    await waitFor(() => expect(stored().cards[0]).toMatchObject({ box: 2, dueDate: '2026-11-16' }));
    expect(stored().cards[0].history).toHaveLength(1);

    await user.click(within(dialog).getByRole('button', { name: /^done$/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps keyboard focus inside the dialog at every step and closes it with Escape', async () => {
    seed([dueCard()]);
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openReview(user);
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: /reveal the lesson/i }));
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: /i recalled it/i }));
    await user.keyboard('{Enter}');
    expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: /^done$/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('returns a card to Box 1, due in two days, when you did not recall it', async () => {
    seed([dueCard({ box: 3 })]);
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openReview(user);
    await user.click(within(dialog).getByRole('button', { name: /reveal the lesson/i }));
    await user.click(within(dialog).getByRole('button', { name: /didn.t recall it/i }));
    expect(await within(dialog).findByText('Back to Box 1.')).toBeTruthy();
    expect(within(dialog).getByText(formatLong('2026-11-11'))).toBeTruthy();
    await waitFor(() => expect(stored().cards[0]).toMatchObject({ box: 1, status: 'active', dueDate: '2026-11-11' }));
    expect(stored().cards[0].history[0]).toMatchObject({ success: false, fromBox: 3, toBox: 1 });
  });

  it('moves a card through all four boxes and into the Mastered archive', async () => {
    seed([dueCard()]);
    const user = userEvent.setup();
    render(<App />);

    const reviewOnce = async () => {
      const dialog = await openReview(user);
      await user.click(within(dialog).getByRole('button', { name: /reveal the lesson/i }));
      await user.click(within(dialog).getByRole('button', { name: /i recalled it/i }));
      await user.click(within(dialog).getByRole('button', { name: /^done$/i }));
    };

    await reviewOnce();
    await waitFor(() => expect(stored().cards[0]).toMatchObject({ box: 2, dueDate: '2026-11-16' }));
    travelTo('2026-11-16');
    await reviewOnce();
    await waitFor(() => expect(stored().cards[0]).toMatchObject({ box: 3, dueDate: '2026-12-07' }));
    travelTo('2026-12-07');
    await reviewOnce();
    await waitFor(() => expect(stored().cards[0]).toMatchObject({ box: 4, dueDate: '2027-02-01' }));
    travelTo('2027-02-01');
    await reviewOnce();
    await waitFor(() => expect(stored().cards[0]).toMatchObject({ status: 'mastered', dueDate: null }));
    expect(stored().cards[0].history.map((h) => h.toBox)).toEqual([2, 3, 4, 'mastered']);

    await user.click(screen.getByRole('button', { name: /^mastered/i }));
    const list = screen.getByRole('region', { name: /all cards/i });
    expect(within(list).getByRole('button', { name: /review linear functions again/i })).toBeTruthy();
  });

  it('lets you edit a card without touching its schedule, and delete it after confirming', async () => {
    seed([dueCard({ box: 2, dueDate: '2026-11-16' })]);
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByRole('region', { name: /all cards/i });
    await user.click(within(list).getByRole('button', { name: /linear functions/i }));
    const detail = await screen.findByRole('dialog', { name: /linear functions/i });

    await user.click(within(detail).getByRole('button', { name: /^edit$/i }));
    const form = await screen.findByRole('dialog', { name: /edit card/i });
    const rule = within(form).getByLabelText(/the rule/i);
    await user.clear(rule);
    await user.type(rule, 'Rise over run.');
    await user.click(within(form).getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(stored().cards[0]).toMatchObject({ rule: 'Rise over run.', box: 2, dueDate: '2026-11-16' }));

    await user.click(within(detail).getByRole('button', { name: /^delete$/i }));
    const confirm = await screen.findByRole('dialog', { name: /delete this card/i });
    await user.click(within(confirm).getByRole('button', { name: /cancel/i }));
    expect(stored().cards).toHaveLength(1);

    await user.click(within(detail).getByRole('button', { name: /^delete$/i }));
    await user.click(within(await screen.findByRole('dialog', { name: /delete this card/i })).getByRole('button', { name: /delete card/i }));
    await waitFor(() => expect(stored().cards).toHaveLength(0));
  });

  it('filters and searches a long list', async () => {
    seed([
      dueCard({}, 'a', 'Linear functions'),
      dueCard({ subject: 'rw', rule: 'Test each choice.' }, 'b', 'Words in Context'),
      dueCard({ box: 2, dueDate: '2026-11-20' }, 'c', 'Circles'),
    ]);
    const user = userEvent.setup();
    render(<App />);
    const list = screen.getByRole('region', { name: /all cards/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);

    await user.type(within(list).getByRole('searchbox', { name: /search cards/i }), 'words');
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));

    await user.clear(within(list).getByRole('searchbox', { name: /search cards/i }));
    await user.click(within(list).getByRole('button', { name: /^upcoming/i }));
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));
    expect(within(list).getByText('Circles')).toBeTruthy();
  });
});

describe('persistence', () => {
  it('keeps cards after the page is refreshed', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await addCardViaForm(user);
    await waitFor(() => expect(stored().cards).toHaveLength(1));
    first.unmount();

    render(<App />);
    expect(await screen.findByText('Linear functions')).toBeTruthy();
    expect(screen.queryByText('Your ledger is empty')).toBeNull();
  });
});

describe('Consistency', () => {
  const tile = (label: string) => screen.getByText(label).closest('div') as HTMLElement;
  const openTab = async (user: User) => {
    await user.click(screen.getByRole('tab', { name: 'Consistency' }));
    await screen.findByRole('heading', { name: 'Consistency' });
  };

  it('shows the weekly target and the planned week', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTab(user);
    expect(screen.getByText(/5 sessions, 210 minutes, 3\.5 hours of study/)).toBeTruthy();
    expect(screen.getByText('Craft & Structure')).toBeTruthy();
    expect(screen.getAllByText('Rest')).toHaveLength(2);
    expect(window.location.hash).toBe('#/consistency');
  });

  it('marks a planned session complete and updates sessions, minutes and completion', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTab(user);
    expect(within(tile('Sessions completed')).getByText('0 / 5')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Mark Math Foundations complete' }));
    const dialog = await screen.findByRole('dialog', { name: /log a session/i });
    expect((within(dialog).getByLabelText(/^date/i) as HTMLInputElement).value).toBe(TODAY);
    expect((within(dialog).getByLabelText(/actual duration/i) as HTMLInputElement).value).toBe('30');
    await user.click(within(dialog).getByRole('button', { name: /save session/i }));

    expect(await within(tile('Sessions completed')).findByText('1 / 5')).toBeTruthy();
    expect(within(tile('Study time')).getByText('30 / 210')).toBeTruthy();
    expect(within(tile('Completion')).getByText('20%')).toBeTruthy();
    expect(screen.getByRole('button', { name: /edit math foundations, 30 minutes/i })).toBeTruthy();
    expect(stored().sessions[0]).toMatchObject({ date: TODAY, sessionKey: 'mon', completed: true, actualMinutes: 30 });
  });

  it('counts the minutes of a session that was not completed, but not the session itself', async () => {
    const user = userEvent.setup();
    render(<App />);
    await openTab(user);
    await user.click(screen.getByRole('button', { name: /^log session$/i }));
    const dialog = await screen.findByRole('dialog', { name: /log a session/i });
    const actual = within(dialog).getByLabelText(/actual duration/i);
    await user.clear(actual);
    await user.type(actual, '15');
    await user.click(within(dialog).getByLabelText('Not completed'));
    await user.click(within(dialog).getByRole('button', { name: /save session/i }));

    expect(await within(tile('Study time')).findByText('15 / 210')).toBeTruthy();
    expect(within(tile('Sessions completed')).getByText('0 / 5')).toBeTruthy();
    expect(stored().sessions[0]).toMatchObject({ completed: false, actualMinutes: 15 });
  });

  it('computes a full week from saved logs and reads it back kindly', async () => {
    travelTo('2026-11-15'); // Sunday
    seed([], [
      session({ id: '1', date: '2026-11-09', actualMinutes: 30 }),
      session({ id: '2', date: '2026-11-10', sessionKey: 'tue', actualMinutes: 35 }),
      session({ id: '3', date: '2026-11-12', sessionKey: 'thu', actualMinutes: 30 }),
      session({ id: '4', date: '2026-11-14', sessionKey: 'sat', actualMinutes: 70 }),
      session({ id: '5', date: '2026-11-15', sessionKey: 'sun', completed: false, actualMinutes: 0 }),
    ]);
    const user = userEvent.setup();
    render(<App />);
    await openTab(user);
    expect(within(tile('Sessions completed')).getByText('4 / 5')).toBeTruthy();
    expect(within(tile('Study time')).getByText('165 / 210')).toBeTruthy();
    expect(within(tile('Completion')).getByText('80%')).toBeTruthy();
    expect(screen.getByText('You’ve completed 4 of 5 sessions this week.')).toBeTruthy();
    expect(screen.getByText('You’ve studied for 2 hours and 45 minutes.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /this week/i, current: true })).toBeTruthy();
  });

  it('navigates between weeks, but never into the future', async () => {
    seed([], [session({ id: '1', date: '2026-11-03', sessionKey: 'tue' })]);
    const user = userEvent.setup();
    render(<App />);
    await openTab(user);
    const next = screen.getByRole('button', { name: 'Next week' }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(screen.getByRole('heading', { name: formatWeekRange('2026-11-02') })).toBeTruthy();
    expect(within(tile('Sessions completed')).getByText('1 / 5')).toBeTruthy();
    expect(next.disabled).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByRole('heading', { name: formatWeekRange(TODAY) })).toBeTruthy();
  });
});

describe('Settings: backup and restore', () => {
  const openSettings = async (user: User) => {
    await user.click(screen.getByRole('button', { name: /settings and backup/i }));
    return screen.findByRole('dialog', { name: /settings and backup/i });
  };

  it('exports a JSON backup that parses back into the same data', async () => {
    const cards = [dueCard()];
    seed(cards, [session({ id: 's1', date: TODAY })]);
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob) => (blobs.push(blob), 'blob:test'));
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const user = userEvent.setup();
    render(<App />);
    const dialog = await openSettings(user);
    await user.click(within(dialog).getByRole('button', { name: /export backup/i }));

    expect(blobs).toHaveLength(1);
    const parsed = parseBackup(await readFileText(blobs[0] as File));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.cards).toEqual(cards);
      expect(parsed.data.sessions).toHaveLength(1);
    }
    click.mockRestore();
  });

  it('refuses an invalid file, and replaces data only after you confirm a valid one', async () => {
    const backup = buildBackup({ ...emptyData(), cards: [dueCard({}, 'imported-1', 'Circles')] }, new Date());
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openSettings(user);
    const input = within(dialog).getByLabelText(/choose a backup file/i);

    await user.upload(input, new File(['not json'], 'bad.json', { type: 'application/json' }));
    expect(await within(dialog).findByText(/nothing was imported/i)).toBeTruthy();
    expect(stored().cards).toHaveLength(0);

    await user.upload(input, new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }));
    const confirm = await screen.findByRole('dialog', { name: /replace your data/i });
    expect(stored().cards).toHaveLength(0); // not applied yet
    await user.click(within(confirm).getByRole('button', { name: /replace my data/i }));
    await waitFor(() => expect(stored().cards.map((c) => c.id)).toEqual(['imported-1']));
  });

  it('deletes everything only after a confirmation', async () => {
    seed([dueCard()]);
    const user = userEvent.setup();
    render(<App />);
    const dialog = await openSettings(user);
    await user.click(within(dialog).getByRole('button', { name: /delete all data/i }));
    const confirm = await screen.findByRole('dialog', { name: /delete all data\?/i });
    await user.click(within(confirm).getByRole('button', { name: /cancel/i }));
    expect(stored().cards).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: /delete all data/i }));
    await user.click(within(await screen.findByRole('dialog', { name: /delete all data\?/i })).getByRole('button', { name: /delete everything/i }));
    await waitFor(() => expect(stored().cards).toHaveLength(0));
  });
});
