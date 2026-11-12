import { useMemo, useRef, useState } from 'react';
import { useLedger } from '../../state/ledger-context';
import type { CardInput, LedgerCard, Subject } from '../../types';
import { Button, Modal, Segmented, TextAreaField, TextField } from '../ui';

const MATH_SKILLS = [
  'Linear equations in one variable',
  'Linear functions',
  'Linear equations in two variables',
  'Systems of two linear equations in two variables',
  'Linear inequalities in one or two variables',
  'Nonlinear functions',
  'Nonlinear equations in one variable and systems of equations in two variables',
  'Equivalent expressions',
  'Ratios, rates, proportional relationships, and units',
  'Percentages',
  'One-variable data: distributions and measures of center and spread',
  'Two-variable data: models and scatterplots',
  'Probability and conditional probability',
  'Inference from sample statistics and margin of error',
  'Evaluating statistical claims',
  'Area and volume',
  'Lines, angles, and triangles',
  'Right triangles and trigonometry',
  'Circles',
];

const RW_SKILLS = [
  'Central Ideas and Details',
  'Command of Evidence',
  'Inferences',
  'Words in Context',
  'Text Structure and Purpose',
  'Cross-Text Connections',
  'Rhetorical Synthesis',
  'Transitions',
  'Boundaries',
  'Form, Structure, and Sense',
];

type Errors = Partial<Record<keyof CardInput, string>>;

const MESSAGES = {
  questionType: 'Add a question type, like “Linear functions”.',
  mistake: 'Describe what you got wrong.',
  trap: 'Name what specifically misled you.',
  rule: 'Write the one-sentence lesson.',
  nextTime: 'Say what you will do differently.',
} as const;

const blank = (subject: Subject): CardInput => ({ subject, questionType: '', mistake: '', trap: '', rule: '', nextTime: '', notes: '' });

interface CardFormProps {
  card?: LedgerCard;
  onSave: (input: CardInput, addAnother: boolean) => void;
  onClose: () => void;
}

export function CardForm({ card, onSave, onClose }: CardFormProps) {
  const { data } = useLedger();
  const [values, setValues] = useState<CardInput>(() =>
    card
      ? { subject: card.subject, questionType: card.questionType, mistake: card.mistake, trap: card.trap, rule: card.rule, nextTime: card.nextTime, notes: card.notes }
      : blank('math'),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [savedCount, setSavedCount] = useState(0);
  const typeInput = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(
    () => Array.from(new Set([...(values.subject === 'math' ? MATH_SKILLS : RW_SKILLS), ...data.cards.filter((c) => c.subject === values.subject).map((c) => c.questionType)])),
    [values.subject, data.cards],
  );

  const set = <K extends keyof CardInput>(key: K, value: CardInput[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (addAnother: boolean) => {
    const next: Errors = {};
    (Object.keys(MESSAGES) as Array<keyof typeof MESSAGES>).forEach((key) => {
      if (!values[key].trim()) next[key] = MESSAGES[key];
    });
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave(values, addAnother);
    if (addAnother) {
      setValues(blank(values.subject));
      setSavedCount((n) => n + 1);
      window.requestAnimationFrame(() => typeInput.current?.focus());
    }
  };

  return (
    <Modal
      title={card ? 'Edit card' : 'New card'}
      description={card ? 'Changing the wording never changes when this card is due.' : 'New cards start in Box 1 and come back for review in 2 days.'}
      size="lg"
      onClose={onClose}
      onSubmit={() => submit(false)}
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {!card && <Button onClick={() => submit(true)}>Save and add another</Button>}
          <Button type="submit" variant="primary">
            {card ? 'Save changes' : 'Add card'}
          </Button>
        </>
      }
    >
      <div className="space-y-5 pt-2">
        {savedCount > 0 && (
          <p role="status" className="rounded-lg bg-sage-50 px-3 py-2 text-sm text-forest-800">
            Card saved to Box 1. Add the next one when you are ready.
          </p>
        )}
        <Segmented
          label="Subject"
          value={values.subject}
          onChange={(subject) => set('subject', subject)}
          options={[
            { value: 'math', label: 'Math' },
            { value: 'rw', label: 'Reading & Writing' },
          ]}
        />
        <TextField
          label="Question type"
          inputRef={typeInput}
          list="question-type-options"
          value={values.questionType}
          onChange={(e) => set('questionType', e.target.value)}
          error={errors.questionType}
          placeholder="e.g. Linear functions, Words in Context"
          autoComplete="off"
        />
        <datalist id="question-type-options">
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <TextAreaField label="My mistake" hint="What did I get wrong?" value={values.mistake} onChange={(e) => set('mistake', e.target.value)} error={errors.mistake} />
        <TextAreaField label="The trap" hint="What specifically misled me?" value={values.trap} onChange={(e) => set('trap', e.target.value)} error={errors.trap} />
        <TextAreaField label="The rule" hint="What is the one-sentence lesson I should remember?" rows={2} value={values.rule} onChange={(e) => set('rule', e.target.value)} error={errors.rule} />
        <TextAreaField label="Next time" hint="What will I do differently?" rows={2} value={values.nextTime} onChange={(e) => set('nextTime', e.target.value)} error={errors.nextTime} />
        <TextAreaField label="Notes" optional hint="Anything else worth remembering." rows={2} value={values.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </Modal>
  );
}
