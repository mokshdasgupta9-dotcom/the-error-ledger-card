import { isValidISODate } from './dates';
import type { AppData, Box, LedgerCard, ReviewEntry, SessionLog } from '../types';

export const STORAGE_KEY = 'sat-error-ledger:v1';
export const UNREADABLE_BACKUP_KEY = 'sat-error-ledger:v1:unreadable-backup';
export const APP_ID = 'sat-error-ledger';
export const SCHEMA_VERSION = 1;
const MAX_LISTED_PROBLEMS = 8;

export const emptyData = (): AppData => ({ cards: [], sessions: [], settings: { lastExportAt: null } });

/* ------------------------------------------------------------------ validation */

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string';
const isNonEmpty = (v: unknown): v is string => isText(v) && v.trim().length > 0;
const isStamp = (v: unknown): v is string => isText(v) && !Number.isNaN(Date.parse(v));
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

class Problems {
  list: string[] = [];
  total = 0;
  add(message: string) {
    this.total += 1;
    if (this.list.length < MAX_LISTED_PROBLEMS) this.list.push(message);
  }
}

function readEntry(raw: unknown, path: string, p: Problems): ReviewEntry | null {
  if (!isRec(raw)) {
    p.add(`${path} is not an object.`);
    return null;
  }
  const before = p.total;
  if (!isNonEmpty(raw.id)) p.add(`${path}: id is missing.`);
  if (!isValidISODate(raw.reviewedOn)) p.add(`${path}: reviewedOn is not a valid date.`);
  if (!isStamp(raw.reviewedAt)) p.add(`${path}: reviewedAt is not a valid timestamp.`);
  if (!isInt(raw.fromBox, 1, 4)) p.add(`${path}: fromBox must be 1, 2, 3 or 4.`);
  if (!(isInt(raw.toBox, 1, 4) || raw.toBox === 'mastered')) p.add(`${path}: toBox must be 1 to 4 or "mastered".`);
  if (typeof raw.success !== 'boolean') p.add(`${path}: success must be true or false.`);
  if (!(raw.nextDue === null || isValidISODate(raw.nextDue))) p.add(`${path}: nextDue must be a date or null.`);
  if (p.total !== before) return null;
  return {
    id: raw.id as string,
    reviewedOn: raw.reviewedOn as string,
    reviewedAt: raw.reviewedAt as string,
    fromBox: raw.fromBox as Box,
    toBox: raw.toBox as ReviewEntry['toBox'],
    success: raw.success as boolean,
    nextDue: raw.nextDue as string | null,
  };
}

function readCard(raw: unknown, path: string, p: Problems): LedgerCard | null {
  if (!isRec(raw)) {
    p.add(`${path} is not an object.`);
    return null;
  }
  const before = p.total;
  if (!isNonEmpty(raw.id)) p.add(`${path}: id is missing.`);
  if (raw.subject !== 'math' && raw.subject !== 'rw') p.add(`${path}: subject must be "math" or "rw".`);
  for (const key of ['questionType', 'mistake', 'trap', 'rule', 'nextTime'] as const) {
    if (!isNonEmpty(raw[key])) p.add(`${path}: ${key} is required.`);
  }
  const notes = raw.notes ?? '';
  if (!isText(notes)) p.add(`${path}: notes must be text.`);
  if (!isStamp(raw.createdAt)) p.add(`${path}: createdAt is not a valid timestamp.`);
  if (!isValidISODate(raw.createdOn)) p.add(`${path}: createdOn is not a valid date.`);
  if (!isInt(raw.box, 1, 4)) p.add(`${path}: box must be 1, 2, 3 or 4.`);
  if (raw.status !== 'active' && raw.status !== 'mastered') {
    p.add(`${path}: status must be "active" or "mastered".`);
  } else if (raw.status === 'active' ? !isValidISODate(raw.dueDate) : raw.dueDate !== null) {
    p.add(`${path}: dueDate does not match the card's status.`);
  }
  const masteredAt = raw.masteredAt ?? null;
  if (masteredAt !== null && !isStamp(masteredAt)) p.add(`${path}: masteredAt is not a valid timestamp.`);
  const history: ReviewEntry[] = [];
  if (!Array.isArray(raw.history)) {
    p.add(`${path}: history must be a list.`);
  } else {
    raw.history.forEach((item, i) => {
      const entry = readEntry(item, `${path}.history[${i}]`, p);
      if (entry) history.push(entry);
    });
  }
  if (p.total !== before) return null;
  return {
    id: raw.id as string,
    subject: raw.subject as LedgerCard['subject'],
    questionType: (raw.questionType as string).trim(),
    mistake: (raw.mistake as string).trim(),
    trap: (raw.trap as string).trim(),
    rule: (raw.rule as string).trim(),
    nextTime: (raw.nextTime as string).trim(),
    notes: (notes as string).trim(),
    createdAt: raw.createdAt as string,
    createdOn: raw.createdOn as string,
    box: raw.box as Box,
    status: raw.status as LedgerCard['status'],
    dueDate: raw.dueDate as string | null,
    masteredAt: masteredAt as string | null,
    history,
  };
}

function readSession(raw: unknown, path: string, p: Problems): SessionLog | null {
  if (!isRec(raw)) {
    p.add(`${path} is not an object.`);
    return null;
  }
  const before = p.total;
  if (!isNonEmpty(raw.id)) p.add(`${path}: id is missing.`);
  if (!isValidISODate(raw.date)) p.add(`${path}: date is not a valid date.`);
  const key = raw.sessionKey ?? null;
  if (key !== null && !(isText(key) && key.length <= 40)) p.add(`${path}: sessionKey must be text or null.`);
  if (!isNonEmpty(raw.sessionName) || raw.sessionName.length > 120) p.add(`${path}: sessionName is required (120 characters at most).`);
  if (!isInt(raw.plannedMinutes, 0, 1440)) p.add(`${path}: plannedMinutes must be a whole number from 0 to 1440.`);
  if (!isInt(raw.actualMinutes, 0, 1440)) p.add(`${path}: actualMinutes must be a whole number from 0 to 1440.`);
  if (typeof raw.completed !== 'boolean') p.add(`${path}: completed must be true or false.`);
  const notes = raw.notes ?? '';
  if (!isText(notes)) p.add(`${path}: notes must be text.`);
  if (!isStamp(raw.createdAt)) p.add(`${path}: createdAt is not a valid timestamp.`);
  if (p.total !== before) return null;
  return {
    id: raw.id as string,
    date: raw.date as string,
    sessionKey: key as string | null,
    sessionName: (raw.sessionName as string).trim(),
    plannedMinutes: raw.plannedMinutes as number,
    actualMinutes: raw.actualMinutes as number,
    completed: raw.completed as boolean,
    notes: (notes as string).trim(),
    createdAt: raw.createdAt as string,
  };
}

export type Validation =
  | { ok: true; data: AppData }
  | { ok: false; errors: string[]; total: number };

/** Checks an unknown value and, only if everything is valid, returns clean typed data. */
export function validateAppData(raw: unknown): Validation {
  if (!isRec(raw)) return { ok: false, errors: ['This is not a ledger backup.'], total: 1 };
  const p = new Problems();
  if (!Array.isArray(raw.cards)) p.add('"cards" must be a list.');
  if (!Array.isArray(raw.sessions)) p.add('"sessions" must be a list.');

  const cards: LedgerCard[] = [];
  const sessions: SessionLog[] = [];
  const cardIds = new Set<string>();
  const sessionIds = new Set<string>();

  if (Array.isArray(raw.cards)) {
    raw.cards.forEach((item, i) => {
      const card = readCard(item, `cards[${i}]`, p);
      if (!card) return;
      if (cardIds.has(card.id)) p.add(`cards[${i}]: id "${card.id}" appears more than once.`);
      else {
        cardIds.add(card.id);
        cards.push(card);
      }
    });
  }
  if (Array.isArray(raw.sessions)) {
    raw.sessions.forEach((item, i) => {
      const session = readSession(item, `sessions[${i}]`, p);
      if (!session) return;
      if (sessionIds.has(session.id)) p.add(`sessions[${i}]: id "${session.id}" appears more than once.`);
      else {
        sessionIds.add(session.id);
        sessions.push(session);
      }
    });
  }

  let lastExportAt: string | null = null;
  if (raw.settings !== undefined && raw.settings !== null) {
    if (!isRec(raw.settings)) p.add('"settings" must be an object.');
    else if (raw.settings.lastExportAt !== undefined && raw.settings.lastExportAt !== null) {
      if (isStamp(raw.settings.lastExportAt)) lastExportAt = raw.settings.lastExportAt;
      else p.add('settings.lastExportAt is not a valid timestamp.');
    }
  }

  if (p.total > 0) return { ok: false, errors: p.list, total: p.total };
  return { ok: true, data: { cards, sessions, settings: { lastExportAt } } };
}

/* ------------------------------------------------------------------ backup files */

export interface BackupFile {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt: string;
  data: AppData;
}

export function buildBackup(data: AppData, now: Date): BackupFile {
  const exportedAt = now.toISOString();
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt, data: { ...data, settings: { lastExportAt: exportedAt } } };
}

export type ParsedBackup =
  | { ok: true; data: AppData; exportedAt: string | null }
  | { ok: false; errors: string[]; total: number };

const fail = (message: string): ParsedBackup => ({ ok: false, errors: [message], total: 1 });

/** Reads the text of a chosen backup file. Nothing is applied until the caller confirms. */
export function parseBackup(text: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return fail('This file is not valid JSON. Choose a backup exported from SAT Error Ledger.');
  }
  if (!isRec(json)) return fail('This file is not a ledger backup.');
  if (json.app !== undefined && json.app !== APP_ID) return fail('This file was not exported from SAT Error Ledger.');
  if (typeof json.schemaVersion === 'number' && json.schemaVersion > SCHEMA_VERSION) {
    return fail('This backup was made by a newer version of the app. Update the app, then import it again.');
  }
  const result = validateAppData(isRec(json.data) ? json.data : json);
  if (!result.ok) return result;
  return { ok: true, data: result.data, exportedAt: isStamp(json.exportedAt) ? json.exportedAt : null };
}

/* ------------------------------------------------------------------ localStorage */

export type LoadStatus = 'ok' | 'empty' | 'unreadable' | 'unavailable';
export interface LoadResult {
  data: AppData;
  status: LoadStatus;
  notice: string | null;
}

const UNAVAILABLE =
  'This browser is blocking storage, so changes will not be saved. Use Settings to export a backup, or try a regular (non-private) window.';

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const serialize = (data: AppData): string =>
  JSON.stringify({ schemaVersion: SCHEMA_VERSION, cards: data.cards, sessions: data.sessions, settings: data.settings });

export function loadFromStorage(storage: Storage | null = getStorage()): LoadResult {
  if (!storage) return { data: emptyData(), status: 'unavailable', notice: UNAVAILABLE };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { data: emptyData(), status: 'unavailable', notice: UNAVAILABLE };
  }
  if (raw === null) return { data: emptyData(), status: 'empty', notice: null };

  try {
    const result = validateAppData(JSON.parse(raw));
    if (result.ok) return { data: result.data, status: 'ok', notice: null };
  } catch {
    /* fall through to the unreadable branch */
  }
  try {
    storage.setItem(UNREADABLE_BACKUP_KEY, raw);
  } catch {
    /* keeping a copy is best effort */
  }
  return {
    data: emptyData(),
    status: 'unreadable',
    notice: `The data saved in this browser could not be read, so the ledger started empty. A copy of the unreadable data was kept under "${UNREADABLE_BACKUP_KEY}" in this browser's storage.`,
  };
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export function saveToStorage(data: AppData, storage: Storage | null = getStorage()): SaveResult {
  if (!storage) return { ok: false, error: UNAVAILABLE };
  try {
    const next = serialize(data);
    if (storage.getItem(STORAGE_KEY) !== next) storage.setItem(STORAGE_KEY, next);
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'This browser could not save your latest changes (storage may be full or blocked). Export a backup from Settings to keep them safe.',
    };
  }
}
