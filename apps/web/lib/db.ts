/**
 * IndexedDB schema (Dexie).
 *
 * The whole household lives in a single row keyed `'current'`. We use a
 * key-value style table rather than relational because the engine operates
 * on the full household struct atomically anyway.
 *
 * Encryption is a Phase 2+ concern; for now we store plaintext. The schema
 * version bump will trigger a migration to encrypted-at-rest later.
 */

import Dexie, { type Table } from 'dexie';
import type { Household } from '@retirement/engine';

interface HouseholdRow {
  id: 'current';
  household: Household;
  updatedAt: number;
}

class RetirementDB extends Dexie {
  households!: Table<HouseholdRow, 'current'>;

  constructor() {
    super('retirement-planning');
    this.version(1).stores({
      households: 'id',
    });
  }
}

let dbInstance: RetirementDB | undefined;

export function getDB(): RetirementDB {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is browser-only');
  }
  if (!dbInstance) dbInstance = new RetirementDB();
  return dbInstance;
}

export async function saveHousehold(h: Household): Promise<void> {
  const db = getDB();
  await db.households.put({ id: 'current', household: h, updatedAt: Date.now() });
}

export async function loadHousehold(): Promise<Household | null> {
  const db = getDB();
  const row = await db.households.get('current');
  return row?.household ?? null;
}

export async function wipeAll(): Promise<void> {
  const db = getDB();
  await db.delete();
  dbInstance = undefined;
}
