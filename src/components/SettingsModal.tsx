import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, Trash2, Upload } from 'lucide-react';
import { toISODate } from '../lib/dates';
import { downloadTextFile, readFileText } from '../lib/files';
import { plural } from '../lib/format';
import { buildBackup, parseBackup } from '../lib/storage';
import { useLedger } from '../state/ledger-context';
import type { AppData } from '../types';
import { Button, ConfirmDialog, Modal } from './ui';

interface PendingImport {
  data: AppData;
  fileName: string;
  exportedAt: string | null;
}

const describe = (d: AppData) => `${plural(d.cards.length, 'card')} and ${plural(d.sessions.length, 'study log')}`;

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { data, replaceAll, resetAll, markExported } = useLedger();
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [problems, setProblems] = useState<{ errors: string[]; total: number } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const exportBackup = () => {
    const now = new Date();
    const backup = buildBackup(data, now);
    downloadTextFile(`sat-error-ledger-backup-${toISODate(now)}.json`, JSON.stringify(backup, null, 2));
    markExported(backup.exportedAt);
    setProblems(null);
    setMessage('Backup downloaded. Keep the file somewhere safe.');
  };

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage(null);
    setProblems(null);
    try {
      const result = parseBackup(await readFileText(file));
      if (result.ok) setPending({ data: result.data, fileName: file.name, exportedAt: result.exportedAt });
      else setProblems({ errors: result.errors, total: result.total });
    } catch {
      setProblems({ errors: ['The file could not be read.'], total: 1 });
    }
  };

  const lastBackup = data.settings.lastExportAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.settings.lastExportAt))
    : null;

  return (
    <>
      <Modal
        title="Settings and backup"
        description="Everything stays in this browser. These tools keep it safe."
        onClose={onClose}
        footer={<Button variant="primary" onClick={onClose}>Done</Button>}
      >
        <div className="space-y-7 pt-2">
          <section aria-labelledby="backup-heading" className="space-y-3">
            <h3 id="backup-heading" className="font-serif text-lg text-ink">Back up and restore</h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Export downloads every card, review and study log as one JSON file. Import reads such a file and replaces what is here.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={exportBackup}>
                <Download className="size-4" aria-hidden="true" /> Export backup
              </Button>
              <Button onClick={() => fileInput.current?.click()}>
                <Upload className="size-4" aria-hidden="true" /> Import backup
              </Button>
              <input ref={fileInput} type="file" accept="application/json,.json" onChange={onFile} className="sr-only" tabIndex={-1} aria-label="Choose a backup file to import" />
            </div>
            <p className="text-xs text-muted">{lastBackup ? `Last backup: ${lastBackup}.` : 'No backup exported yet.'}</p>
            {message && (
              <p role="status" className="text-sm font-medium text-forest-700">
                {message}
              </p>
            )}
            {problems && (
              <div role="alert" className="rounded-lg border border-berry-100 bg-berry-50 px-4 py-3 text-sm text-berry-700">
                <p className="font-medium">Nothing was imported. Your current data is untouched.</p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                  {problems.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
                {problems.total > problems.errors.length && <p className="mt-1.5">And {problems.total - problems.errors.length} more.</p>}
              </div>
            )}
          </section>

          <section aria-labelledby="where-heading" className="space-y-2 rounded-xl border border-sage-200 bg-sage-50 px-4 py-4">
            <h3 id="where-heading" className="font-serif text-lg text-ink">Where your data lives</h3>
            <p className="text-sm leading-relaxed text-ink-soft">
              Your cards and study logs are saved in this browser on this device (localStorage). GitHub Pages only hosts the app. It never receives your data and does not sync it between devices.
            </p>
            <p className="text-sm leading-relaxed text-ink-soft">
              To use another phone or computer, export a backup here and import it there. Clearing browsing data or using a private window can erase what is saved, so export now and then.
            </p>
          </section>

          <section aria-labelledby="reset-heading" className="space-y-3">
            <h3 id="reset-heading" className="font-serif text-lg text-ink">Start over</h3>
            <p className="text-sm leading-relaxed text-ink-soft">Deletes every card and study log from this browser. Export a backup first if you might want them back.</p>
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              <Trash2 className="size-4" aria-hidden="true" /> Delete all data
            </Button>
          </section>
        </div>
      </Modal>

      {pending && (
        <ConfirmDialog
          title="Replace your data with this backup?"
          confirmLabel="Replace my data"
          onCancel={() => setPending(null)}
          onConfirm={() => {
            replaceAll(pending.data);
            setPending(null);
            setMessage(`Imported ${describe(pending.data)}.`);
          }}
          message={
            <>
              <p>
                <strong className="font-medium text-ink">{pending.fileName}</strong> contains {describe(pending.data)}
                {pending.exportedAt ? `, exported ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(pending.exportedAt))}` : ''}.
              </p>
              <p className="mt-2">
                Your current data ({describe(data)}) will be replaced. This cannot be undone, so export a backup first if you are unsure.
              </p>
            </>
          }
        />
      )}

      {confirmReset && (
        <ConfirmDialog
          title="Delete all data?"
          confirmLabel="Delete everything"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            resetAll();
            setConfirmReset(false);
            setMessage('All data deleted.');
          }}
          message={<p>This removes {describe(data)} from this browser. It cannot be undone.</p>}
        />
      )}
    </>
  );
}
