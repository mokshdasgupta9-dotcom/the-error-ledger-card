import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { formatShort } from '../../lib/dates';
import { filterCards, filterCounts, ledgerStats, nextDueInfo, sortCards, type CardFilter, type CardSort } from '../../lib/ledger';
import { BOXES, BOX_INTERVAL_LABEL, isDue } from '../../lib/srs';
import { useLedger } from '../../state/ledger-context';
import type { CardInput, LedgerCard } from '../../types';
import { Banner, Button, ConfirmDialog, EmptyState } from '../ui';
import { CardDetail } from './CardDetail';
import { CardForm } from './CardForm';
import { CardList, PAGE_SIZE } from './CardList';
import { DueSection } from './DueSection';
import { ReviewModal } from './ReviewModal';
import { StatsStrip } from './StatsStrip';

type FormState = { mode: 'create' } | { mode: 'edit'; id: string };

export function LedgerTab() {
  const { data, today, addCard, updateCard, deleteCard } = useLedger();

  const [filter, setFilter] = useState<CardFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CardSort>('due');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [form, setForm] = useState<FormState | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reviewIds, setReviewIds] = useState<string[] | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [added, setAdded] = useState<LedgerCard | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);
  const stats = useMemo(() => ledgerStats(data.cards, today), [data.cards, today]);
  const counts = useMemo(() => filterCounts(data.cards, today), [data.cards, today]);
  const dueCards = useMemo(() => sortCards(data.cards.filter((c) => isDue(c, today)), 'due'), [data.cards, today]);
  const nextDue = useMemo(() => nextDueInfo(data.cards, today), [data.cards, today]);
  const listed = useMemo(() => sortCards(filterCards(data.cards, filter, deferredQuery, today), sort), [data.cards, filter, deferredQuery, sort, today]);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(null), 9000);
    return () => window.clearTimeout(timer);
  }, [added]);
  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 2500);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const detailCard = data.cards.find((c) => c.id === detailId) ?? null;
  const editCardTarget = form?.mode === 'edit' ? (data.cards.find((c) => c.id === form.id) ?? null) : null;
  const deleteTarget = data.cards.find((c) => c.id === deleteId) ?? null;

  const save = (input: CardInput, addAnother: boolean) => {
    if (form?.mode === 'edit') {
      updateCard(form.id, input);
      setForm(null);
      return;
    }
    const card = addCard(input);
    setAdded(card);
    setHighlightId(card.id);
    if (!addAnother) setForm(null);
  };

  const clearFilters = () => {
    setFilter('all');
    setQuery('');
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-tight text-ink sm:text-5xl">Error Ledger</h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
            Turn each mistake or lucky guess into a lesson you keep. Cards return on a spaced schedule until they stick.
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setForm({ mode: 'create' })}>
          <Plus className="size-4" aria-hidden="true" /> New card
        </Button>
      </div>

      {added && (
        <Banner onDismiss={() => setAdded(null)}>
          Added “{added.questionType}” to Box 1. First review: {added.dueDate ? formatShort(added.dueDate) : ''}.
        </Banner>
      )}

      {data.cards.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface shadow-soft">
          <EmptyState
            title="Your ledger is empty"
            action={
              <Button variant="primary" onClick={() => setForm({ mode: 'create' })}>
                Create your first card
              </Button>
            }
          >
            After a practice set, add a card for each question you missed or guessed. Each card comes back for review on a fixed schedule.
          </EmptyState>
          <ol className="mx-auto mb-10 grid max-w-xl grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
            {BOXES.map((box) => (
              <li key={box} className="bg-paper px-4 py-3 text-center">
                <p className="text-sm font-medium text-ink">Box {box}</p>
                <p className="text-xs text-muted">every {BOX_INTERVAL_LABEL[box]}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <StatsStrip stats={stats} />
          <DueSection due={dueCards} nextDue={nextDue} today={today} onReview={setReviewIds} />
          <CardList
            cards={listed}
            counts={counts}
            filter={filter}
            onFilter={(f) => {
              setFilter(f);
              setLimit(PAGE_SIZE);
            }}
            query={query}
            onQuery={(q) => {
              setQuery(q);
              setLimit(PAGE_SIZE);
            }}
            sort={sort}
            onSort={setSort}
            limit={limit}
            onMore={() => setLimit((n) => n + PAGE_SIZE)}
            today={today}
            highlightId={highlightId}
            onOpen={setDetailId}
            onReviewAgain={(id) => setReviewIds([id])}
            onClear={clearFilters}
          />
        </>
      )}

      {detailCard && (
        <CardDetail
          card={detailCard}
          onClose={() => setDetailId(null)}
          onEdit={() => setForm({ mode: 'edit', id: detailCard.id })}
          onDelete={() => setDeleteId(detailCard.id)}
          onReview={() => {
            setDetailId(null);
            setReviewIds([detailCard.id]);
          }}
        />
      )}
      {form?.mode === 'create' && <CardForm onSave={save} onClose={() => setForm(null)} />}
      {form?.mode === 'edit' && editCardTarget && <CardForm card={editCardTarget} onSave={save} onClose={() => setForm(null)} />}
      {reviewIds && <ReviewModal ids={reviewIds} onClose={() => setReviewIds(null)} />}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete this card?"
          confirmLabel="Delete card"
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            deleteCard(deleteTarget.id);
            setDeleteId(null);
            setDetailId(null);
          }}
          message={
            <p>
              “{deleteTarget.questionType}” and its review history will be removed. This cannot be undone.
            </p>
          }
        />
      )}
    </div>
  );
}
