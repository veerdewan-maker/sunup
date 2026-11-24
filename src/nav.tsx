import { createContext, useContext } from 'react';
import type { Meal } from './types';

export type Tab = 'today' | 'train' | 'eat' | 'progress';

export type View =
  | { name: 'settings' }
  | { name: 'workout' }
  | { name: 'addFood'; date: string; meal: Meal }
  | { name: 'library' }
  | { name: 'history' }
  | { name: 'day'; dayId: string };

export interface Nav {
  tab: Tab;
  setTab: (t: Tab) => void;
  push: (v: View) => void;
  /** Swap the current page for another without adding a back step. */
  replace: (v: View) => void;
  back: () => void;
}

export const NavContext = createContext<Nav>({ tab: 'today', setTab: () => undefined, push: () => undefined, replace: () => undefined, back: () => undefined });
export const useNav = () => useContext(NavContext);
