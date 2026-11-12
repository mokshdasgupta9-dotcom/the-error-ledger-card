import { useEffect, useState } from 'react';
import { msUntilNextMidnight, todayISO, type ISODate } from '../lib/dates';

/** Today's local date. Refreshes at midnight and when the tab regains focus, so "due today" stays correct. */
export function useToday(): ISODate {
  const [today, setToday] = useState<ISODate>(() => todayISO());

  useEffect(() => {
    const refresh = () =>
      setToday((previous) => {
        const next = todayISO();
        return next === previous ? previous : next;
      });
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        refresh();
        arm();
      }, msUntilNextMidnight() + 1000);
    };
    arm();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return today;
}
