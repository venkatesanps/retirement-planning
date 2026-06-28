/**
 * Zustand store for the household.
 *
 * Loads from IndexedDB on mount (via `useHydrateStore`), autosaves on every
 * mutation. Components subscribe to slices via selectors.
 */

import { create } from 'zustand';
import { useEffect, useRef } from 'react';
import type { Household } from '@retirement/engine';
import { loadHousehold, saveHousehold } from './db';

interface StoreState {
  household: Household | null;
  isHydrated: boolean;
  setHousehold: (h: Household) => void;
  patchHousehold: (patch: (h: Household) => Household) => void;
  clear: () => void;
  _setHydrated: (h: Household | null) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  household: null,
  isHydrated: false,
  setHousehold: (h) => {
    set({ household: h });
    void saveHousehold(h);
  },
  patchHousehold: (patch) => {
    const cur = get().household;
    if (!cur) return;
    const next = patch(cur);
    set({ household: next });
    void saveHousehold(next);
  },
  clear: () => set({ household: null }),
  _setHydrated: (h) => set({ household: h, isHydrated: true }),
}));

/**
 * Mount-time hook: load IndexedDB into the store exactly once per app session.
 * Safe to call in multiple components (idempotent).
 */
export function useHydrateStore(): void {
  const hydrated = useStore((s) => s.isHydrated);
  const started = useRef(false);
  useEffect(() => {
    if (hydrated || started.current) return;
    started.current = true;
    void loadHousehold().then((h) => {
      useStore.getState()._setHydrated(h);
    });
  }, [hydrated]);
}
