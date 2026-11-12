import type { ISODate } from './lib/dates';

export type Subject = 'math' | 'rw';
export type Box = 1 | 2 | 3 | 4;
export type CardStatus = 'active' | 'mastered';

/** The fields a person fills in when creating or editing a card. */
export interface CardInput {
  subject: Subject;
  questionType: string;
  mistake: string;
  trap: string;
  rule: string;
  nextTime: string;
  notes: string;
}

export interface ReviewEntry {
  id: string;
  reviewedOn: ISODate;
  reviewedAt: string;
  fromBox: Box;
  toBox: Box | 'mastered';
  success: boolean;
  nextDue: ISODate | null;
}

export interface LedgerCard extends CardInput {
  id: string;
  createdAt: string;
  createdOn: ISODate;
  box: Box;
  status: CardStatus;
  /** Local calendar date of the next review. Null once a card is mastered. */
  dueDate: ISODate | null;
  masteredAt: string | null;
  history: ReviewEntry[];
}

export interface SessionInput {
  date: ISODate;
  /** Key of the planned session this log belongs to, or null for an extra session. */
  sessionKey: string | null;
  sessionName: string;
  plannedMinutes: number;
  actualMinutes: number;
  completed: boolean;
  notes: string;
}

export interface SessionLog extends SessionInput {
  id: string;
  createdAt: string;
}

export interface Settings {
  lastExportAt: string | null;
}

export interface AppData {
  cards: LedgerCard[];
  sessions: SessionLog[];
  settings: Settings;
}
