/**
 * Form 1040 parser.
 *
 * Recent 1040s (2020–) have stable line numbering. We extract:
 *   - Filing status (checkbox region near the top)
 *   - Line 11: Adjusted Gross Income
 *   - Line 3a: Qualified dividends
 *   - Line 7:  Capital gain or (loss)
 *
 * PDF text extraction does not preserve checkbox state reliably across all
 * issuers; we fall back to keyword presence + nearby digits when needed.
 */

import type { ParsedField } from './types';
import { fmtUSD, parseMoney, squash } from './utils';

function detectFilingStatus(text: string): { status: string; confidence: number } | null {
  const lower = text.toLowerCase();
  // Some PDFs render the checked box as a filled bullet "■" or "X" near the label.
  const candidates: Array<[RegExp, string]> = [
    [/[■xX]\s*married filing jointly/i, 'mfj'],
    [/[■xX]\s*married filing separately/i, 'mfs'],
    [/[■xX]\s*single/i, 'single'],
    [/[■xX]\s*head of household/i, 'hoh'],
  ];
  for (const [re, status] of candidates) {
    if (re.test(text)) return { status, confidence: 0.9 };
  }
  // Fallback: appears as plain text label without checkbox state
  if (lower.includes('married filing jointly')) return { status: 'mfj', confidence: 0.45 };
  if (lower.includes('head of household')) return { status: 'hoh', confidence: 0.45 };
  if (lower.includes('married filing separately')) return { status: 'mfs', confidence: 0.45 };
  if (lower.includes('single')) return { status: 'single', confidence: 0.4 };
  return null;
}

function findLineValue(squashed: string, lineLabel: RegExp): number {
  // Match label, optional ".." dots, then capture a money value within 80 chars.
  // The 1040 layout puts values right-aligned in their box on the same line.
  const re = new RegExp(`${lineLabel.source}[^$\\d]{0,40}\\$?\\(?([\\d,]+)\\)?`, 'i');
  const m = squashed.match(re);
  if (!m || !m[1]) return NaN;
  return parseMoney(m[1]);
}

export function parseForm1040(text: string): { fields: ParsedField[]; errors?: string[] } {
  const squashed = squash(text);
  const fields: ParsedField[] = [];
  const errors: string[] = [];

  const status = detectFilingStatus(text);
  if (status) {
    const labels: Record<string, string> = {
      single: 'Single',
      mfj: 'Married filing jointly',
      mfs: 'Married filing separately',
      hoh: 'Head of household',
    };
    fields.push({
      label: 'Filing status',
      value: labels[status.status] ?? status.status,
      unit: 'enum',
      confidence: status.confidence,
    });
  } else {
    errors.push('Could not determine filing status.');
  }

  // Line 11: AGI
  const agi = findLineValue(squashed, /(?:Adjusted gross income|Line\s*11)/);
  if (Number.isFinite(agi) && agi > 0 && agi < 100_000_000) {
    fields.push({
      label: 'AGI',
      value: fmtUSD(agi),
      numeric: agi,
      unit: 'usd',
      confidence: 0.8,
    });
  } else {
    errors.push('Could not find adjusted gross income (line 11).');
  }

  // Line 3a: Qualified dividends
  const qDiv = findLineValue(squashed, /(?:Qualified dividends|Line\s*3a)/);
  if (Number.isFinite(qDiv) && qDiv >= 0 && qDiv < 10_000_000) {
    fields.push({
      label: 'Qualified dividends',
      value: fmtUSD(qDiv),
      numeric: qDiv,
      unit: 'usd',
      confidence: 0.7,
    });
  }

  // Line 7: Capital gain or (loss)
  const capGain = findLineValue(squashed, /(?:Capital gain or \(loss\)|Line\s*7)/);
  if (Number.isFinite(capGain) && Math.abs(capGain) < 100_000_000) {
    fields.push({
      label: 'Capital gain (loss)',
      value: fmtUSD(capGain),
      numeric: capGain,
      unit: 'usd',
      confidence: 0.65,
    });
  }

  return { fields, errors: errors.length ? errors : undefined };
}
