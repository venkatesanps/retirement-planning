/**
 * Generic 401(k) / brokerage / IRA statement parser.
 *
 * These statements vary wildly by issuer (Fidelity, Vanguard, Schwab, Empower,
 * Merrill, T. Rowe). Instead of issuer-specific parsers, we extract a small
 * set of high-value fields using widely-shared layout patterns, and lean on
 * the user to confirm.
 *
 * Always low-medium confidence. The UI surfaces this clearly.
 */

import type { ParsedField } from './types';
import { fmtUSD, parseMoney, squash } from './utils';

/** Search labels that map to a dollar value somewhere on the same line. */
const BALANCE_LABELS = [
  /Total\s+(?:Account|Plan|Portfolio)\s+(?:Value|Balance)/i,
  /(?:Ending|Closing)\s+(?:Account\s+)?(?:Balance|Value)/i,
  /Total\s+Assets/i,
  /Current\s+Account\s+Value/i,
];

const CONTRIB_LABELS = [
  /Year[- ]to[- ]Date\s+Contributions?/i,
  /YTD\s+Contributions?/i,
  /Employee\s+Contributions?\s+\(YTD\)/i,
];

const MATCH_LABELS = [
  /Employer\s+Match(?:ing)?\s+\(?YTD\)?/i,
  /Year[- ]to[- ]Date\s+Employer\s+Match/i,
  /Company\s+Match\s+\(YTD\)/i,
];

const BASIS_LABELS = [
  /Total\s+Cost\s+Basis/i,
  /Cost\s+Basis/i,
  /Adjusted\s+(?:Cost\s+)?Basis/i,
];

function findFirstAmount(squashed: string, labels: RegExp[]): { amount: number; evidence?: string } {
  for (const label of labels) {
    const re = new RegExp(`${label.source}[^$\\d]{0,40}\\$?([\\d,]+(?:\\.\\d{2})?)`, 'i');
    const m = squashed.match(re);
    if (m && m[1]) {
      const amount = parseMoney(m[1]);
      if (Number.isFinite(amount) && amount > 0) {
        const start = Math.max(0, (m.index ?? 0) - 30);
        const end = Math.min(squashed.length, (m.index ?? 0) + m[0].length + 30);
        return { amount, evidence: squashed.slice(start, end) };
      }
    }
  }
  return { amount: NaN };
}

/**
 * Heuristic: the largest dollar amount on the document that isn't a clear
 * micro-line-item (we set a 100k floor for retirement context). Useful as a
 * fallback for "total balance" when no labeled match found.
 */
function largestAmountAbove(text: string, floor: number): number {
  const re = /\$([\d,]+(?:\.\d{2})?)/g;
  let best = 0;
  for (const m of text.matchAll(re)) {
    const n = parseMoney(m[1]);
    if (Number.isFinite(n) && n > best && n >= floor && n < 50_000_000) best = n;
  }
  return best;
}

export function parseAccountStatement(
  text: string,
  kind: '401k-statement' | 'brokerage-statement',
): { fields: ParsedField[]; errors?: string[]; notes?: string[] } {
  const squashed = squash(text);
  const fields: ParsedField[] = [];
  const errors: string[] = [];
  const notes: string[] = [];

  // Balance
  const bal = findFirstAmount(squashed, BALANCE_LABELS);
  if (Number.isFinite(bal.amount)) {
    fields.push({
      label: 'Account balance',
      value: fmtUSD(bal.amount),
      numeric: bal.amount,
      unit: 'usd',
      confidence: 0.7,
      evidence: bal.evidence,
    });
  } else {
    const fallback = largestAmountAbove(squashed, 10000);
    if (fallback > 0) {
      fields.push({
        label: 'Account balance (best guess)',
        value: fmtUSD(fallback),
        numeric: fallback,
        unit: 'usd',
        confidence: 0.35,
      });
      notes.push(
        'No labeled "Total Account Value" found — used the largest dollar amount as a guess. Please verify.',
      );
    } else {
      errors.push('Could not locate account balance.');
    }
  }

  // YTD contribution (401k only typically)
  if (kind === '401k-statement') {
    const ytd = findFirstAmount(squashed, CONTRIB_LABELS);
    if (Number.isFinite(ytd.amount)) {
      fields.push({
        label: 'YTD contribution',
        value: fmtUSD(ytd.amount),
        numeric: ytd.amount,
        unit: 'usd',
        confidence: 0.65,
        evidence: ytd.evidence,
      });
    }
    const match = findFirstAmount(squashed, MATCH_LABELS);
    if (Number.isFinite(match.amount)) {
      fields.push({
        label: 'Employer match (YTD)',
        value: fmtUSD(match.amount),
        numeric: match.amount,
        unit: 'usd',
        confidence: 0.65,
        evidence: match.evidence,
      });
    }
  }

  // Cost basis (brokerage)
  if (kind === 'brokerage-statement') {
    const basis = findFirstAmount(squashed, BASIS_LABELS);
    if (Number.isFinite(basis.amount)) {
      fields.push({
        label: 'Total cost basis',
        value: fmtUSD(basis.amount),
        numeric: basis.amount,
        unit: 'usd',
        confidence: 0.6,
        evidence: basis.evidence,
      });
    }
  }

  return {
    fields,
    errors: errors.length ? errors : undefined,
    notes: notes.length ? notes : undefined,
  };
}
