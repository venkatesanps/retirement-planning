/**
 * IndexedDB schema (Dexie).
 *
 * - households: single row keyed `'current'` with the engine Household object.
 * - documents:  one row per parsed document (just the extracted values, never
 *               the PDF bytes). Keyed by uuid; ordered by parsedAt for the list.
 *
 * Encryption is a Phase 2+ concern; for now we store plaintext. The schema
 * version bump will trigger a migration to encrypted-at-rest later.
 */

import Dexie, { type Table } from 'dexie';
import type { Household } from '@retirement/engine';
import type { ParsedDocument } from './parsers';

interface HouseholdRow {
  id: 'current';
  household: Household;
  updatedAt: number;
}

class RetirementDB extends Dexie {
  households!: Table<HouseholdRow, 'current'>;
  documents!: Table<ParsedDocument, string>;

  constructor() {
    super('retirement-planning');
    this.version(1).stores({
      households: 'id',
    });
    this.version(2).stores({
      households: 'id',
      documents: 'id, parsedAt, kind',
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

export async function saveDocument(doc: ParsedDocument): Promise<void> {
  const db = getDB();
  await db.documents.put(doc);
}

export async function loadDocuments(): Promise<ParsedDocument[]> {
  const db = getDB();
  return db.documents.orderBy('parsedAt').reverse().toArray();
}

export async function deleteDocument(id: string): Promise<void> {
  const db = getDB();
  await db.documents.delete(id);
}

export async function wipeAll(): Promise<void> {
  const db = getDB();
  await db.delete();
  dbInstance = undefined;
}
