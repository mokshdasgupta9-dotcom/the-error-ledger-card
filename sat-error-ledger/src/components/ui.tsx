import { useEffect, useId, useRef } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- buttons */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-50';
const buttonVariants: Record<Variant, string> = {
  primary: 'bg-forest-700 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_rgb(35_40_38/0.3)] hover:bg-forest-800',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-sage-400 hover:bg-white',
  ghost: 'text-ink-soft hover:bg-sage-100 hover:text-ink',
  danger: 'border border-berry-100 bg-berry-50 text-berry-700 hover:bg-berry-100',
};
const buttonSizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-[15px]',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={cx(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...rest} />;
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft transition hover:bg-sage-100 hover:text-ink disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- modal */

let scrollLocks = 0;
/** Open dialogs, oldest first. Only the top-most one reacts to the keyboard. */
const dialogStack: Array<{ close: () => void }> = [];
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl' } as const;

interface ModalProps {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof widths;
  /** When set, the dialog content is wrapped in a form so Enter submits it. */
  onSubmit?: () => void;
  dismissOnBackdrop?: boolean;
}

export function Modal({ title, description, onClose, children, footer, size = 'md', onSubmit, dismissOnBackdrop = true }: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const node = panel.current;
    if (!node) return;
    const entry = { close: () => closeRef.current() };
    dialogStack.push(entry);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    scrollLocks += 1;
    document.body.style.overflow = 'hidden';
    if (!node.contains(document.activeElement)) (node.querySelector<HTMLElement>(FOCUSABLE) ?? node).focus();

    // Listening on the document (not the dialog) keeps Escape and Tab working even if the
    // focused element is removed while the dialog is open.
    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== entry) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        entry.close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) {
        event.preventDefault();
        node.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!node.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      dialogStack.splice(dialogStack.indexOf(entry), 1);
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (scrollLocks === 0) document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, []);

  const inner = (
    <>
      <header className="flex items-start justify-between gap-4 px-6 pb-3 pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="font-serif text-2xl leading-tight text-ink">
            {title}
          </h2>
          {description && (
            <p id={descId} className="mt-1 text-sm text-muted">
              {description}
            </p>
          )}
        </div>
        <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
          <X className="size-5" aria-hidden="true" />
        </IconButton>
      </header>
      <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-paper/70 px-6 py-4">{footer}</footer>}
    </>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/35 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cx(
          'flex max-h-[92dvh] w-full animate-pop flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop outline-none sm:rounded-2xl',
          widths[size],
        )}
      >
        {onSubmit ? (
          <form
            noValidate
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
          >
            {inner}
          </form>
        ) : (
          inner
        )}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  danger = true,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <Modal
      title={title}
      size="sm"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[15px] leading-relaxed text-ink-soft">{message}</div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- form controls */

export const controlClass =
  'w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20 aria-[invalid=true]:border-berry-600 aria-[invalid=true]:ring-berry-600/15';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: (control: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, optional, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-[13px] font-medium text-ink-soft">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-berry-600">
          {error}
        </p>
      )}
    </div>
  );
}

type Shared = { label: string; hint?: string; error?: string; optional?: boolean };

export function TextField({ label, hint, error, optional, className, inputRef, ...input }: Shared & InputHTMLAttributes<HTMLInputElement> & { inputRef?: Ref<HTMLInputElement> }) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {({ id, describedBy, invalid }) => (
        <input ref={inputRef} id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cx(controlClass, className)} {...input} />
      )}
    </Field>
  );
}

export function TextAreaField({ label, hint, error, optional, className, ...area }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {({ id, describedBy, invalid }) => (
        <textarea id={id} rows={3} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cx(controlClass, 'resize-y leading-relaxed', className)} {...area} />
      )}
    </Field>
  );
}

export function SelectField({ label, hint, error, optional, className, children, ...select }: Shared & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} hint={hint} error={error} optional={optional}>
      {({ id, describedBy, invalid }) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={invalid || undefined} className={cx(controlClass, 'pr-8', className)} {...select}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-[13px] font-medium text-ink-soft">{label}</legend>
      <div className="inline-flex rounded-lg bg-sage-100 p-0.5">
        {options.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="block rounded-md px-3.5 py-1.5 text-sm font-medium text-ink-soft transition peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-forest-600">
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ---------------------------------------------------------------- display */

type Tone = 'neutral' | 'sage' | 'forest' | 'berry';
const tones: Record<Tone, string> = {
  neutral: 'bg-paper text-ink-soft ring-line-strong',
  sage: 'bg-sage-100 text-forest-800 ring-sage-200',
  forest: 'bg-forest-700 text-white ring-forest-700',
  berry: 'bg-berry-50 text-berry-700 ring-berry-100',
};

export function Badge({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  );
}

export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      className="h-1.5 overflow-hidden rounded-full bg-sage-100"
    >
      <div className="h-full rounded-full bg-forest-600 transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function LedgerMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect x="12" y="8" width="40" height="48" rx="6" stroke="currentColor" strokeWidth="2" />
      <path d="M20 22h24M20 31h24M20 40h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M37.5 41.5l4.2 4.2 7.3-8.4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function EmptyState({ title, children, action, compact }: { title: string; children: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cx('flex flex-col items-center text-center', compact ? 'py-9' : 'py-16')}>
      <LedgerMark className="mb-5 size-16 text-sage-300" />
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{children}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Banner({ tone = 'info', children, onDismiss }: { tone?: 'info' | 'warn'; children: ReactNode; onDismiss?: () => void }) {
  return (
    <div
      role={tone === 'warn' ? 'alert' : 'status'}
      className={cx(
        'mb-6 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed',
        tone === 'warn' ? 'border-berry-100 bg-berry-50 text-berry-700' : 'border-sage-200 bg-sage-50 text-forest-800',
      )}
    >
      <div>{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="-mr-1 -mt-0.5 rounded-md p-1 opacity-70 transition hover:opacity-100">
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
