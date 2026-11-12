import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { createCard, editCard, reviewCard } from '../lib/srs';
import { newId } from '../lib/id';
import { emptyData, loadFromStorage, saveToStorage, STORAGE_KEY } from '../lib/storage';
import type { ISODate } from '../lib/dates';
import type { AppData, CardInput, LedgerCard, SessionInput, SessionLog } from '../types';
import { useToday } from './useToday';

type Action =
  | { type: 'addCard'; card: LedgerCard }
  | { type: 'updateCard'; id: string; input: CardInput }
  | { type: 'deleteCard'; id: string }
  | { type: 'review'; id: string; success: boolean; today: ISODate; nowIso: string; entryId: string }
  | { type: 'addSession'; session: SessionLog }
  | { type: 'updateSession'; id: string; input: SessionInput }
  | { type: 'deleteSession'; id: string }
  | { type: 'replace'; data: AppData }
  | { type: 'exported'; at: string };

const clampMinutes = (n: number) => Math.min(1440, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));

export const cleanSession = (input: SessionInput): SessionInput => ({
  date: input.date,
  sessionKey: input.sessionKey,
  sessionName: input.sessionName.trim(),
  plannedMinutes: clampMinutes(input.plannedMinutes),
  actualMinutes: clampMinutes(input.actualMinutes),
  completed: input.completed,
  notes: input.notes.trim(),
});

export function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'addCard':
      return { ...state, cards: [...state.cards, action.card] };
    case 'updateCard':
      return { ...state, cards: state.cards.map((c) => (c.id === action.id ? editCard(c, action.input) : c)) };
    case 'deleteCard':
      return { ...state, cards: state.cards.filter((c) => c.id !== action.id) };
    case 'review':
      return {
        ...state,
        cards: state.cards.map((c) =>
          c.id === action.id ? reviewCard(c, action.success, action.today, new Date(action.nowIso), action.entryId) : c,
        ),
      };
    case 'addSession':
      return { ...state, sessions: [...state.sessions, action.session] };
    case 'updateSession':
      return { ...state, sessions: state.sessions.map((s) => (s.id === action.id ? { ...s, ...cleanSession(action.input) } : s)) };
    case 'deleteSession':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) };
    case 'replace':
      return action.data;
    case 'exported':
      return { ...state, settings: { ...state.settings, lastExportAt: action.at } };
  }
}

interface LedgerContextValue {
  data: AppData;
  today: ISODate;
  /** A message about data that could not be read at start-up, if any. */
  notice: string | null;
  /** A message when the browser refused to save, if any. */
  saveError: string | null;
  dismissNotice: () => void;
  addCard: (input: CardInput) => LedgerCard;
  updateCard: (id: string, input: CardInput) => void;
  deleteCard: (id: string) => void;
  /** Records the person's own verdict on a review. */
  review: (id: string, success: boolean) => void;
  addSession: (input: SessionInput) => void;
  updateSession: (id: string, input: SessionInput) => void;
  deleteSession: (id: string) => void;
  replaceAll: (data: AppData) => void;
  resetAll: () => void;
  markExported: (at: string) => void;
}

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => loadFromStorage());
  const [data, dispatch] = useReducer(reducer, initial.data);
  const [notice, setNotice] = useState<string | null>(initial.notice);
  const [saveError, setSaveError] = useState<string | null>(null);
  const today = useToday();
  const todayRef = useRef(today);
  todayRef.current = today;

  // Persist after every change.
  useEffect(() => {
    const result = saveToStorage(data);
    setSaveError(result.ok ? null : result.error);
  }, [data]);

  // Pick up changes made in another tab of the same browser.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      const fresh = loadFromStorage();
      if (fresh.status === 'ok' || fresh.status === 'empty') dispatch({ type: 'replace', data: fresh.data });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo<LedgerContextValue>(
    () => ({
      data,
      today,
      notice,
      saveError,
      dismissNotice: () => setNotice(null),
      addCard(input) {
        const card = createCard(input, todayRef.current, new Date(), newId());
        dispatch({ type: 'addCard', card });
        return card;
      },
      updateCard: (id, input) => dispatch({ type: 'updateCard', id, input }),
      deleteCard: (id) => dispatch({ type: 'deleteCard', id }),
      review: (id, success) =>
        dispatch({ type: 'review', id, success, today: todayRef.current, nowIso: new Date().toISOString(), entryId: newId() }),
      addSession: (input) =>
        dispatch({ type: 'addSession', session: { ...cleanSession(input), id: newId(), createdAt: new Date().toISOString() } }),
      updateSession: (id, input) => dispatch({ type: 'updateSession', id, input }),
      deleteSession: (id) => dispatch({ type: 'deleteSession', id }),
      replaceAll: (next) => dispatch({ type: 'replace', data: next }),
      resetAll: () => dispatch({ type: 'replace', data: emptyData() }),
      markExported: (at) => dispatch({ type: 'exported', at }),
    }),
    [data, today, notice, saveError],
  );

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>;
}

export function useLedger(): LedgerContextValue {
  const value = useContext(LedgerContext);
  if (!value) throw new Error('useLedger must be used inside <LedgerProvider>.');
  return value;
}
