import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from './components/ui';
import { NavContext, type Tab, type View } from './nav';
import { AddFood } from './screens/AddFood';
import { Eat } from './screens/Eat';
import { Onboarding } from './screens/Onboarding';
import { Progress } from './screens/Progress';
import { Settings } from './screens/Settings';
import { Today } from './screens/Today';
import { DayDetail, History, Library, Train } from './screens/Train';
import { Workout } from './screens/Workout';
import { useStore } from './store';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z' },
  { id: 'train', label: 'Train', icon: 'M3 10v4M6 7v10M18 7v10M21 10v4M6 12h12' },
  { id: 'eat', label: 'Eat', icon: 'M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 3c-2 2-3 5-3 8h3v10' },
  { id: 'progress', label: 'Progress', icon: 'M4 19V5M4 19h16M8 15l3-4 3 2 5-7' },
];

export function App() {
  const state = useStore();
  const [tab, setTabState] = useState<Tab>('today');
  const [stack, setStack] = useState<View[]>([]);

  useEffect(() => {
    const onPop = () => setStack((s) => s.slice(0, -1));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const push = useCallback((v: View) => {
    history.pushState({ depth: Date.now() }, '');
    setStack((s) => [...s, v]);
  }, []);
  const replace = useCallback((v: View) => setStack((s) => [...s.slice(0, -1), v]), []);
  const back = useCallback(() => history.back(), []);
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    window.scrollTo(0, 0);
  }, []);
  const nav = useMemo(() => ({ tab, setTab, push, replace, back }), [tab, setTab, push, replace, back]);

  if (!state.profile) {
    return (
      <>
        <Onboarding />
        <Toaster />
      </>
    );
  }

  const top = stack[stack.length - 1];

  return (
    <NavContext.Provider value={nav}>
      <div className="app" hidden={!!top}>
        <main className="tab-body">
          {tab === 'today' && <Today />}
          {tab === 'train' && <Train />}
          {tab === 'eat' && <Eat />}
          {tab === 'progress' && <Progress />}
        </main>
        {state.active && (
          <button className="resume-bar" onClick={() => push({ name: 'workout' })}>
            <span>Workout in progress: {state.active.name}</span>
            <strong>Resume</strong>
          </button>
        )}
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={t.icon} />
              </svg>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
      {top?.name === 'settings' && <Settings />}
      {top?.name === 'workout' && <Workout />}
      {top?.name === 'addFood' && <AddFood date={top.date} meal={top.meal} />}
      {top?.name === 'library' && <Library />}
      {top?.name === 'history' && <History />}
      {top?.name === 'day' && <DayDetail dayId={top.dayId} />}
      <Toaster />
    </NavContext.Provider>
  );
}
