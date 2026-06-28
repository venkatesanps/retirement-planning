/**
 * Zustand store for the household + parsed documents.
 *
 * Loads from IndexedDB on first mount (via `useHydrateStore`), autosaves on
 * every mutation. Components subscribe to slices via selectors.
 */

import { create } from 'zustand';
import { useEffect, useRef } from 'react';
import type { Household } from '@retirement/engine';
import type { ParsedDocument } from './parsers';
import {
  deleteDocument,
  loadDocuments,
  loadHousehold,
  saveDocument,
  saveHousehold,
} from './db';

interface StoreState {
  household: Household | null;
  documents: ParsedDocument[];
  isHydrated: boolean;
  setHousehold: (h: Household) => void;
  patchHousehold: (patch: (h: Household) => Household) => void;
  addDocument: (doc: ParsedDocument) => void;
  removeDocument: (id: string) => void;
  clear: () => void;
  _setHydrated: (h: Household | null, docs: ParsedDocument[]) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  household: null,
  documents: [],
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
  addDocument: (doc) => {
    set((s) => ({ documents: [doc, ...s.documents.filter((d) => d.id !== doc.id)] }));
    void saveDocument(doc);
  },
  removeDocument: (id) => {
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    void deleteDocument(id);
  },
  clear: () => set({ household: null, documents: [] }),
  _setHydrated: (h, docs) => set({ household: h, documents: docs, isHydrated: true }),
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
    void Promise.all([loadHousehold(), loadDocuments()]).then(([h, docs]) => {
      useStore.getState()._setHydrated(h, docs);
    });
  }, [hydrated]);
}
