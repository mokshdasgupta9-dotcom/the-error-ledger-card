import { useState } from 'react';
import { isValidISODate, weekdayIndex, type ISODate } from '../../lib/dates';
import { STUDY_SESSIONS } from '../../lib/schedule';
import { useLedger } from '../../state/ledger-context';
import type { SessionInput, SessionLog } from '../../types';
import { Button, Modal, Segmented, SelectField, TextAreaField, TextField } from '../ui';

const CUSTOM = 'custom';
const slotFor = (key: string | null) => STUDY_SESSIONS.find((s) => s.key === key);

export interface SessionPreset {
  date?: ISODate;
  sessionKey?: string;
}

type Errors = Partial<Record<'date' | 'name' | 'planned' | 'actual', string>>;

export function SessionForm({
  log,
  preset,
  onSave,
  onDelete,
  onClose,
}: {
  log?: SessionLog;
  preset?: SessionPreset;
  onSave: (input: SessionInput) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const { today } = useLedger();
  const initialDate = log?.date ?? preset?.date ?? today;
  const logSlot = slotFor(log?.sessionKey ?? null);
  const initialKey = log ? (logSlot ? logSlot.key : CUSTOM) : (preset?.sessionKey ?? STUDY_SESSIONS.find((s) => s.weekday === weekdayIndex(initialDate))?.key ?? STUDY_SESSIONS[0].key);
  const initialMinutes = slotFor(initialKey)?.minutes ?? 30;

  const [date, setDate] = useState<string>(initialDate);
  const [key, setKey] = useState(initialKey);
  const [customName, setCustomName] = useState(log && !logSlot ? log.sessionName : '');
  const [planned, setPlanned] = useState(String(log?.plannedMinutes ?? initialMinutes));
  const [actual, setActual] = useState(String(log?.actualMinutes ?? initialMinutes));
  const [actualTouched, setActualTouched] = useState(Boolean(log));
  const [status, setStatus] = useState<'yes' | 'no'>(log && !log.completed ? 'no' : 'yes');
  const [notes, setNotes] = useState(log?.notes ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const chooseSession = (next: string) => {
    setKey(next);
    const slot = slotFor(next);
    if (slot) {
      setPlanned(String(slot.minutes));
      if (!actualTouched) setActual(String(slot.minutes));
    }
  };

  const submit = () => {
    const next: Errors = {};
    if (!isValidISODate(date)) next.date = 'Choose a date.';
    else if (date > today) next.date = 'Log a session on or before today.';
    const name = key === CUSTOM ? customName.trim() : (slotFor(key)?.name ?? '');
    if (!name) next.name = 'Give this session a name.';
    const plannedMinutes = Number(planned);
    if (planned.trim() === '' || !Number.isInteger(plannedMinutes) || plannedMinutes < 0 || plannedMinutes > 600) next.planned = 'Enter whole minutes, from 0 to 600.';
    const actualMinutes = Number(actual);
    const floor = status === 'yes' ? 1 : 0;
    if (actual.trim() === '' || !Number.isInteger(actualMinutes) || actualMinutes < floor || actualMinutes > 600) {
      next.actual = status === 'yes' ? 'Enter the minutes you studied, from 1 to 600.' : 'Enter whole minutes, from 0 to 600.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({
      date,
      sessionKey: key === CUSTOM ? null : key,
      sessionName: name,
      plannedMinutes,
      actualMinutes,
      completed: status === 'yes',
      notes,
    });
  };

  return (
    <Modal
      title={log ? 'Edit session' : 'Log a session'}
      description="Only sessions marked completed count toward your weekly sessions. Every minute you studied still counts toward study time."
      onClose={onClose}
      onSubmit={submit}
      dismissOnBackdrop={false}
      footer={
        <>
          {log && onDelete && (
            <Button variant="danger" onClick={onDelete} className="mr-auto">
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save session
          </Button>
        </>
      }
    >
      <div className="space-y-5 pt-2">
        <TextField label="Date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <SelectField label="Session" value={key} onChange={(e) => chooseSession(e.target.value)}>
          {STUDY_SESSIONS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.name} ({s.minutes} min)
            </option>
          ))}
          <option value={CUSTOM}>Other session</option>
        </SelectField>
        {key === CUSTOM && <TextField label="Session name" value={customName} onChange={(e) => setCustomName(e.target.value)} error={errors.name} maxLength={120} placeholder="e.g. Practice test review" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Planned duration (minutes)" type="number" inputMode="numeric" min={0} max={600} step={1} value={planned} onChange={(e) => setPlanned(e.target.value)} error={errors.planned} />
          <TextField
            label="Actual duration (minutes)"
            type="number"
            inputMode="numeric"
            min={0}
            max={600}
            step={1}
            value={actual}
            onChange={(e) => {
              setActual(e.target.value);
              setActualTouched(true);
            }}
            error={errors.actual}
          />
        </div>
        <Segmented
          label="Was it completed?"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'yes', label: 'Completed' },
            { value: 'no', label: 'Not completed' },
          ]}
        />
        {status === 'no' && <p className="-mt-2 text-xs text-muted">Skipped or cut short. It will not count as a completed session, and any minutes you did study still count.</p>}
        <TextAreaField label="Notes" optional rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
    </Modal>
  );
}
