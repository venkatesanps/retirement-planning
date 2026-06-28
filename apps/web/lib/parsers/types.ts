/**
 * Document parser types.
 *
 * Every parser takes extracted PDF text and returns a `ParsedDocument` that
 * tells the UI what to display and (optionally) what household fields to
 * propose for update. The user always confirms before anything is saved.
 */

export type DocumentKind =
  | 'ssa-statement'
  | 'form-1040'
  | '401k-statement'
  | 'brokerage-statement'
  | 'unknown';

export interface ParsedField {
  /** Human-readable label for the UI ("AGI", "PIA at FRA"). */
  label: string;
  /** Raw extracted value formatted for display ("$3,100/mo", "MFJ"). */
  value: string;
  /** Numeric value if the field is a number; used for the "apply to plan" action. */
  numeric?: number;
  /** Optional unit hint for the apply action. */
  unit?: 'usd' | 'usd-per-month' | 'percent' | 'age' | 'year' | 'enum';
  /** Confidence 0..1; below 0.5 we tag as "low" in the UI. */
  confidence: number;
  /** Snippet of source text we matched, for the user to verify. */
  evidence?: string;
}

export interface ParsedDocument {
  id: string;
  /** File name as uploaded. Not the file itself — we never store the file. */
  filename: string;
  /** Bytes (for display only). */
  sizeBytes: number;
  /** UNIX ms when parsed. */
  parsedAt: number;
  kind: DocumentKind;
  /** Human label for the detected kind ("Social Security statement"). */
  kindLabel: string;
  fields: ParsedField[];
  /** Free-form notes the parser wants to surface (e.g., "multi-page detected"). */
  notes?: string[];
  /** Errors during parsing — surfaced for the user to know it was partial. */
  errors?: string[];
  /**
   * Optional preview of the extracted PDF text, populated when fields were
   * missing or the document type was unknown. Lets the user verify what
   * pdf.js read and copy values manually. Capped at ~3000 chars.
   */
  debugText?: string;
}

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  'ssa-statement': 'Social Security statement',
  'form-1040': 'Form 1040',
  '401k-statement': '401(k) / 403(b) statement',
  'brokerage-statement': 'Brokerage / IRA statement',
  unknown: 'Unknown document',
};
