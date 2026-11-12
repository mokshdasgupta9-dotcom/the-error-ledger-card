import { Search } from 'lucide-react';
import type { ISODate } from '../../lib/dates';
import { SUBJECT_LABEL } from '../../lib/format';
import { dueInfo, type CardFilter, type CardSort } from '../../lib/ledger';
import type { LedgerCard } from '../../types';
import { Badge, Button, cx, EmptyState } from '../ui';

const FILTERS: ReadonlyArray<{ id: CardFilter; label: string }> = [
  { id: 'all', label: 'All cards' },
  { id: 'due', label: 'Due today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'math', label: 'Math' },
  { id: 'rw', label: 'Reading & Writing' },
  { id: 'mastered', label: 'Mastered' },
];

export const PAGE_SIZE = 30;

interface CardListProps {
  cards: LedgerCard[];
  counts: Record<CardFilter, number>;
  filter: CardFilter;
  onFilter: (filter: CardFilter) => void;
  query: string;
  onQuery: (query: string) => void;
  sort: CardSort;
  onSort: (sort: CardSort) => void;
  limit: number;
  onMore: () => void;
  today: ISODate;
  highlightId: string | null;
  onOpen: (id: string) => void;
  onReviewAgain: (id: string) => void;
  onClear: () => void;
}

export function CardList(props: CardListProps) {
  const { cards, counts, filter, onFilter, query, onQuery, sort, onSort, limit, onMore, today, highlightId, onOpen, onReviewAgain, onClear } = props;
  const visible = cards.slice(0, limit);

  return (
    <section aria-labelledby="cards-heading" className="space-y-4">
      <h2 id="cards-heading" className="text-2xl text-ink">
        All cards
      </h2>

      <div className="space-y-3">
        <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <div role="group" aria-label="Filter cards" className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
            {FILTERS.map(({ id, label }) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onFilter(id)}
                  className={cx(
                    'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
                    active ? 'border-forest-700 bg-forest-700 text-white' : 'border-line-strong bg-surface text-ink-soft hover:border-sage-400 hover:text-ink',
                  )}
                >
                  {label} <span className={cx('tabular-nums', active ? 'text-white/75' : 'text-muted')}>{counts[id]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              aria-label="Search cards"
              placeholder="Search cards"
              className="h-10 w-full rounded-lg border border-line-strong bg-white pl-9 pr-3 text-[15px] text-ink placeholder:text-muted/70 transition focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as CardSort)}
            aria-label="Sort cards"
            className="h-10 rounded-lg border border-line-strong bg-white px-3 text-sm text-ink-soft transition focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/20"
          >
            <option value="due">Sort: due soonest</option>
            <option value="newest">Sort: newest first</option>
            <option value="oldest">Sort: oldest first</option>
          </select>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-soft">
          <EmptyState
            compact
            title="No cards match"
            action={
              <Button onClick={onClear}>Clear search and filters</Button>
            }
          >
            Try a different word, or switch to another filter.
          </EmptyState>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-soft">
            {visible.map((card) => {
              const info = dueInfo(card, today);
              return (
                <li key={card.id} className={cx('flex items-center gap-2 pr-3', card.id === highlightId && 'animate-settle')}>
                  <button
                    type="button"
                    onClick={() => onOpen(card.id)}
                    className="grid min-w-0 flex-1 gap-x-4 gap-y-1.5 px-5 py-3.5 text-left transition hover:bg-white sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-ink">{card.questionType}</span>
                        <Badge className="hidden sm:inline-flex">{SUBJECT_LABEL[card.subject]}</Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted">{card.mistake}</span>
                    </span>
                    <span className="flex items-center gap-2 sm:justify-end">
                      {card.status === 'mastered' ? (
                        <Badge tone="forest">Mastered</Badge>
                      ) : (
                        <>
                          <Badge tone="sage">Box {card.box}</Badge>
                          <span className={cx('text-[13px]', info.tone === 'overdue' ? 'text-berry-600' : 'text-muted')}>{info.text}</span>
                        </>
                      )}
                    </span>
                  </button>
                  {card.status === 'mastered' && (
                    <Button size="sm" variant="ghost" aria-label={`Review ${card.questionType} again`} onClick={() => onReviewAgain(card.id)}>
                      Review again
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between gap-3 text-sm text-muted">
            <p>
              Showing {visible.length} of {cards.length}
            </p>
            {cards.length > visible.length && (
              <Button size="sm" onClick={onMore}>
                Show {Math.min(PAGE_SIZE, cards.length - visible.length)} more
              </Button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
