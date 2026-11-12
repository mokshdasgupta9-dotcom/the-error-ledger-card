import type { KeyboardEvent } from 'react';
import { Settings } from 'lucide-react';
import { cx, IconButton, LedgerMark } from './ui';

export type Tab = 'ledger' | 'consistency';

const TABS: ReadonlyArray<{ id: Tab; label: string }> = [
  { id: 'ledger', label: 'Error Ledger' },
  { id: 'consistency', label: 'Consistency' },
];

export function Header({ tab, onTab, onSettings }: { tab: Tab; onTab: (tab: Tab) => void; onSettings: () => void }) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const index = TABS.findIndex((t) => t.id === tab);
    const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length];
    onTab(next.id);
    window.requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
  };

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-forest-700 text-paper">
            <LedgerMark className="size-5" />
          </span>
          <span className="font-serif text-xl tracking-tight text-ink">SAT Ledger</span>
        </div>

        <div
          role="tablist"
          aria-label="Sections"
          onKeyDown={onKeyDown}
          className="order-last flex w-full rounded-lg bg-sage-100/80 p-0.5 sm:order-none sm:w-auto"
        >
          {TABS.map(({ id, label }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onTab(id)}
                className={cx(
                  'flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition sm:flex-none',
                  selected ? 'bg-surface text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <IconButton label="Settings and backup" onClick={onSettings}>
          <Settings className="size-5" aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}
