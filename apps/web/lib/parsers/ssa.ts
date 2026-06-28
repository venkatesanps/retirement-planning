/**
 * SSA statement parser.
 *
 * Targets the Personalized Monthly Retirement Benefit Estimates section of
 * the My Social Security statement PDF (ssa.gov/myaccount). That section lists
 * estimated benefits at three claim ages: 62, full retirement age, and 70.
 *
 * The statement uses one of two phrasings depending on year:
 *   "If you stop working and start receiving benefits at age 70..."
 *   "Your estimated benefit at age 70 is..."
 *
 * We try both. The actual amounts appear as "$X,XXX a month".
 */

import type { ParsedField } from './types';
import { fmtUSDperMo, parseMoney, squash } from './utils';

/**
 * Try to find the dollar amount associated with a given age. Returns NaN if
 * not found.
 */
function findBenefitAtAge(squashed: string, age: number): { amount: number; evidence?: string } {
  // Several patterns, in order of specificity
  const ageStr = String(age);
  const patterns = [
    new RegExp(
      `(?:start(?:ing)?|receiv(?:e|ing) benefits|begin(?:ning)?) at age ${ageStr}[^$]{0,120}\\$([\\d,]+)`,
      'i',
    ),
    new RegExp(`age ${ageStr}[^$]{0,80}\\$([\\d,]+)\\s*(?:a|per)\\s*month`, 'i'),
    new RegExp(`age ${ageStr}[^$]{0,80}\\$([\\d,]+)`, 'i'),
    new RegExp(`\\$([\\d,]+)\\s*(?:a|per)\\s*month[^$]{0,60}age ${ageStr}`, 'i'),
  ];
  for (const re of patterns) {
    const m = squashed.match(re);
    if (m && m[1]) {
      const amount = parseMoney(m[1]);
      if (Number.isFinite(amount) && amount > 100 && amount < 20000) {
        const start = Math.max(0, (m.index ?? 0) - 30);
        const end = Math.min(squashed.length, (m.index ?? 0) + m[0].length + 30);
        return { amount, evidence: squashed.slice(start, end) };
      }
    }
  }
  return { amount: NaN };
}

export function parseSSAStatement(text: string): {
  fields: ParsedField[];
  errors?: string[];
} {
  const squashed = squash(text);
  const fields: ParsedField[] = [];
  const errors: string[] = [];

  const at62 = findBenefitAtAge(squashed, 62);
  if (Number.isFinite(at62.amount)) {
    fields.push({
      label: 'PIA at age 62',
      value: fmtUSDperMo(at62.amount),
      numeric: at62.amount,
      unit: 'usd-per-month',
      confidence: 0.85,
      evidence: at62.evidence,
    });
  } else {
    errors.push('Could not find benefit estimate at age 62.');
  }

  // FRA is typically 67 for anyone born 1960+, occasionally 66+N months
  let fraFound = false;
  for (const fraAge of [67, 66]) {
    const atFRA = findBenefitAtAge(squashed, fraAge);
    if (Number.isFinite(atFRA.amount)) {
      fields.push({
        label: `PIA at full retirement age (${fraAge})`,
        value: fmtUSDperMo(atFRA.amount),
        numeric: atFRA.amount,
        unit: 'usd-per-month',
        confidence: 0.85,
        evidence: atFRA.evidence,
      });
      fraFound = true;
      break;
    }
  }
  if (!fraFound) errors.push('Could not find benefit estimate at full retirement age.');

  const at70 = findBenefitAtAge(squashed, 70);
  if (Number.isFinite(at70.amount)) {
    fields.push({
      label: 'PIA at age 70',
      value: fmtUSDperMo(at70.amount),
      numeric: at70.amount,
      unit: 'usd-per-month',
      confidence: 0.85,
      evidence: at70.evidence,
    });
  } else {
    errors.push('Could not find benefit estimate at age 70.');
  }

  return { fields, errors: errors.length ? errors : undefined };
}
