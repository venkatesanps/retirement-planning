/**
 * Generic 401(k) / brokerage / IRA statement parser.
 *
 * These statements vary wildly by issuer (Fidelity, Vanguard, Schwab, Empower,
 * Merrill, T. Rowe, TIAA, Principal). Instead of an exhaustive issuer-specific
 * parser, we cast a wide net of label patterns and use lazy regex matches that
 * tolerate dates and table layout between the label and the value.
 *
 * Always low-medium confidence by design. The UI surfaces a debug snippet so
 * users can copy / share the extracted text when the parser still misses.
 */

import type { ParsedField } from './types';
import { fmtUSD, parseMoney, squash } from './utils';

// --- Label catalog -----------------------------------------------------------
//
// Each entry is a phrase we look for. Ordered loosely from most specific to
// most generic; the first match wins.

const BALANCE_LABELS = [
  // Account / plan / portfolio totals
  /Total\s+(?:Account|Plan|Portfolio|Holdings)\s+(?:Value|Balance|Worth)/i,
  /Total\s+Vanguard\s+Assets/i, // Vanguard
  /Total\s+Contract\s+Value/i, // TIAA
  /Net\s+Portfolio\s+Value/i,
  /(?:Ending|Closing|Current)\s+(?:Account\s+)?(?:Balance|Value)/i,
  /Vested\s+(?:Account\s+)?Balance/i, // Empower, Principal
  /Account\s+Value\s+as\s+of/i, // Schwab/Vanguard quarterly
  /Plan\s+Balance/i,
  /Current\s+Account\s+Value/i,
  /Total\s+Assets/i,
  /Total\s+Investment\s+Value/i,
  /Total\s+Value/i, // most generic
];

const CONTRIB_LABELS = [
  /Year[- ]to[- ]Date\s+Contributions?/i,
  /YTD\s+(?:Employee\s+)?Contributions?/i,
  /Employee\s+Contributions?\s+\(?YTD\)?/i,
  /Your\s+Contributions?\s+\(?YTD\)?/i,
  /Pre[- ]Tax\s+Contributions?/i,
];

const MATCH_LABELS = [
  /Employer\s+Match(?:ing)?\s+\(?YTD\)?/i,
  /Year[- ]to[- ]Date\s+Employer\s+(?:Match|Contributions?)/i,
  /Company\s+Match\s+\(?YTD\)?/i,
  /Employer\s+Contributions?\s+\(?YTD\)?/i,
];

const BASIS_LABELS = [
  /Total\s+(?:Adjusted\s+)?Cost\s+Basis/i,
  /Adjusted\s+(?:Cost\s+)?Basis/i,
  /Cost\s+Basis/i,
];

// --- Core matchers -----------------------------------------------------------

/**
 * Find a dollar value near a label. Strategy:
 *  - Up to ~120 chars after the label, prefer a $-prefixed amount.
 *  - Lazy quantifier means we take the first $ amount we see, which is the
 *    one immediately associated with the label even if a date sits between
 *    them ("Total Account Value as of 12/31/2025 $720,000.00").
 *  - Fallback: same window but without the $ requirement (handles plain-
 *    number tables). To avoid grabbing dates, we require a comma or two
 *    fractional digits, since real balances almost always have one.
 */
function findFirstAmount(
  squashed: string,
  labels: RegExp[],
): { amount: number; evidence?: string } {
  for (const label of labels) {
    // Pass 1: require $ prefix
    const dollar = new RegExp(
      `${label.source}[\\s\\S]{0,120}?\\$\\s*([\\d,]+(?:\\.\\d{2})?)`,
      'i',
    );
    const m1 = squashed.match(dollar);
    if (m1 && m1[1]) {
      const amount = parseMoney(m1[1]);
      if (Number.isFinite(amount) && amount > 0) {
        return { amount, evidence: snippetAround(squashed, m1.index ?? 0, m1[0].length) };
      }
    }

    // Pass 2: no $ — require either a thousands separator or two decimals
    // (filters out plain-integer dates and box numbers).
    const noDollar = new RegExp(
      `${label.source}[\\s\\S]{0,120}?\\s([\\d]{1,3}(?:,\\d{3})+(?:\\.\\d{2})?|\\d+\\.\\d{2})\\b`,
      'i',
    );
    const m2 = squashed.match(noDollar);
    if (m2 && m2[1]) {
      const amount = parseMoney(m2[1]);
      if (Number.isFinite(amount) && amount > 0) {
        return { amount, evidence: snippetAround(squashed, m2.index ?? 0, m2[0].length) };
      }
    }
  }
  return { amount: NaN };
}

function snippetAround(text: string, idx: number, len: number, pad = 30): string {
  const start = Math.max(0, idx - pad);
  const end = Math.min(text.length, idx + len + pad);
  let s = text.slice(start, end).trim();
  if (start > 0) s = '…' + s;
  if (end < text.length) s = s + '…';
  return s;
}

/**
 * Heuristic fallback: the largest dollar amount on the document above a
 * sensible retirement-account floor. Lowered to $5K because some smaller IRAs
 * legitimately have low balances.
 */
function largestAmountAbove(text: string, floor: number): { amount: number; evidence?: string } {
  const re = /\$\s*([\d]{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})/g;
  let bestAmount = 0;
  let bestIdx = -1;
  let bestLen = 0;
  for (const m of text.matchAll(re)) {
    const n = parseMoney(m[1]);
    if (Number.isFinite(n) && n > bestAmount && n >= floor && n < 50_000_000) {
      bestAmount = n;
      bestIdx = m.index ?? -1;
      bestLen = m[0].length;
    }
  }
  if (bestAmount === 0) return { amount: NaN };
  return {
    amount: bestAmount,
    evidence: bestIdx >= 0 ? snippetAround(text, bestIdx, bestLen) : undefined,
  };
}

export function parseAccountStatement(
  text: string,
  kind: '401k-statement' | 'brokerage-statement',
): { fields: ParsedField[]; errors?: string[]; notes?: string[] } {
  const squashed = squash(text);
  const fields: ParsedField[] = [];
  const errors: string[] = [];
  const notes: string[] = [];

  // Balance — labeled first, fallback to largest amount
  const labeled = findFirstAmount(squashed, BALANCE_LABELS);
  if (Number.isFinite(labeled.amount)) {
    fields.push({
      label: 'Account balance',
      value: fmtUSD(labeled.amount),
      numeric: labeled.amount,
      unit: 'usd',
      confidence: 0.7,
      evidence: labeled.evidence,
    });
  } else {
    const fallback = largestAmountAbove(squashed, 5000);
    if (Number.isFinite(fallback.amount)) {
      fields.push({
        label: 'Account balance (best guess)',
        value: fmtUSD(fallback.amount),
        numeric: fallback.amount,
        unit: 'usd',
        confidence: 0.35,
        evidence: fallback.evidence,
      });
      notes.push(
        'No labeled "Total Account Value" found — used the largest dollar amount on the page as a guess. Please verify before applying.',
      );
    } else {
      errors.push(
        'Could not locate an account balance. Your statement may use unusual wording, or the values may be in an image-only layout. Use the "Show extracted text" toggle to copy the balance manually, or enter it in Onboarding.',
      );
    }
  }

  // YTD contributions (401k only typically)
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
