import { useCallback, useEffect, useState } from 'react';
import { ConsistencyTab } from './components/consistency/ConsistencyTab';
import { Header, type Tab } from './components/Header';
import { LedgerTab } from './components/ledger/LedgerTab';
import { SettingsModal } from './components/SettingsModal';
import { Banner } from './components/ui';
import { LedgerProvider, useLedger } from './state/ledger-context';

const readTab = (): Tab => (window.location.hash.startsWith('#/consistency') ? 'consistency' : 'ledger');

/** The tab lives in the URL hash, so refreshing and bookmarks work on GitHub Pages without any server routing. */
function useHashTab(): [Tab, (tab: Tab) => void] {
  const [tab, setTab] = useState<Tab>(readTab);
  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const choose = useCallback((next: Tab) => {
    window.location.hash = `/${next}`;
    setTab(next);
  }, []);
  return [tab, choose];
}

function Shell() {
  const [tab, setTab] = useHashTab();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { notice, saveError, dismissNotice } = useLedger();

  useEffect(() => {
    document.title = `${tab === 'ledger' ? 'Error Ledger' : 'Consistency'} · SAT Error Ledger`;
  }, [tab]);

  return (
    <div className="min-h-dvh">
      <Header tab={tab} onTab={setTab} onSettings={() => setSettingsOpen(true)} />
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        {notice && (
          <Banner tone="warn" onDismiss={dismissNotice}>
            {notice}
          </Banner>
        )}
        {saveError && <Banner tone="warn">{saveError}</Banner>}
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === 'ledger' ? <LedgerTab /> : <ConsistencyTab />}
        </div>
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-muted sm:px-6">
        Saved only in this browser. Open Settings to back up or move your data.
      </footer>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <LedgerProvider>
      <Shell />
    </LedgerProvider>
  );
}
