/**
 * Reference data: tax brackets, deductions, contribution limits, SS bend points,
 * RMD divisors.
 *
 * Values are 2026 projected (or last known with assumptions noted in comments).
 * Update annually. This file is intentionally small and pure data — it should
 * be safe for a contributor with no engine knowledge to bump for the next tax
 * year.
 */

import type { FilingStatus } from './types';

export const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  // 2026 projections; will be updated when IRS publishes final figures
  single: 15000,
  mfj: 30000,
  mfs: 15000,
  hoh: 22500,
};

interface Bracket {
  upTo: number; // marginal up to this taxable income; Infinity for top
  rate: number;
}

/** 2026 federal income tax brackets (projected, indexed for inflation). */
export const FEDERAL_BRACKETS_2026: Record<FilingStatus, Bracket[]> = {
  single: [
    { upTo: 11800, rate: 0.10 },
    { upTo: 48000, rate: 0.12 },
    { upTo: 102500, rate: 0.22 },
    { upTo: 195800, rate: 0.24 },
    { upTo: 248700, rate: 0.32 },
    { upTo: 621400, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  mfj: [
    { upTo: 23600, rate: 0.10 },
    { upTo: 96000, rate: 0.12 },
    { upTo: 205000, rate: 0.22 },
    { upTo: 391500, rate: 0.24 },
    { upTo: 497400, rate: 0.32 },
    { upTo: 745800, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  mfs: [
    { upTo: 11800, rate: 0.10 },
    { upTo: 48000, rate: 0.12 },
    { upTo: 102500, rate: 0.22 },
    { upTo: 195800, rate: 0.24 },
    { upTo: 248700, rate: 0.32 },
    { upTo: 372900, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
  hoh: [
    { upTo: 16850, rate: 0.10 },
    { upTo: 64300, rate: 0.12 },
    { upTo: 102500, rate: 0.22 },
    { upTo: 195800, rate: 0.24 },
    { upTo: 248700, rate: 0.32 },
    { upTo: 621400, rate: 0.35 },
    { upTo: Infinity, rate: 0.37 },
  ],
};

/** Long-term capital gains brackets (projected for 2026). */
export const LTCG_BRACKETS_2026: Record<FilingStatus, Bracket[]> = {
  single: [
    { upTo: 49000, rate: 0.0 },
    { upTo: 540000, rate: 0.15 },
    { upTo: Infinity, rate: 0.20 },
  ],
  mfj: [
    { upTo: 98000, rate: 0.0 },
    { upTo: 608000, rate: 0.15 },
    { upTo: Infinity, rate: 0.20 },
  ],
  mfs: [
    { upTo: 49000, rate: 0.0 },
    { upTo: 304000, rate: 0.15 },
    { upTo: Infinity, rate: 0.20 },
  ],
  hoh: [
    { upTo: 65500, rate: 0.0 },
    { upTo: 574000, rate: 0.15 },
    { upTo: Infinity, rate: 0.20 },
  ],
};

/**
 * Compute federal income tax on a given taxable income (after deductions).
 */
export function federalTax(taxableIncome: number, brackets: Bracket[]): number {
  if (taxableIncome <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    const span = Math.min(taxableIncome, b.upTo) - prev;
    if (span <= 0) break;
    tax += span * b.rate;
    prev = b.upTo;
    if (taxableIncome <= b.upTo) break;
  }
  return tax;
}

/**
 * RMD age. Per SECURE 2.0:
 *  - Born 1951-1959: RMDs begin at 73
 *  - Born 1960+:    RMDs begin at 75
 */
export function rmdStartAge(birthYear: number): number {
  return birthYear >= 1960 ? 75 : 73;
}

/**
 * Uniform Lifetime Table — IRS Pub. 590-B (2022 update).
 * Divisor by age (used when sole beneficiary is not >10 yrs younger spouse).
 * Withdrawal = prior-year-end balance / divisor.
 */
const ULT: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0,
  79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0,
  86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8,
  100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3,
  107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1,
  114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

export function ultDivisor(age: number): number {
  if (age < 72) return Infinity;
  if (age > 120) return ULT[120]!;
  return ULT[age] ?? ULT[120]!;
}

/**
 * Social Security full retirement age (FRA), in years.
 * Anyone born 1960 or later → FRA 67.
 * 1955-1959 → graduated 66 + N months. Use simple 67 for ≥1960, 66 otherwise.
 */
export function socialSecurityFRA(birthYear: number): number {
  if (birthYear >= 1960) return 67;
  return 66;
}

/**
 * SS benefit adjustment for early/delayed claim relative to FRA.
 * Approximation: -6.67%/yr for first 3 yrs before FRA, then -5%/yr.
 * +8%/yr delayed retirement credits up to age 70.
 */
export function ssClaimAdjustment(claimAge: number, fra: number): number {
  if (claimAge === fra) return 1.0;
  if (claimAge < fra) {
    const monthsEarly = (fra - claimAge) * 12;
    const first36 = Math.min(36, monthsEarly);
    const beyond = Math.max(0, monthsEarly - 36);
    const reduction = first36 * (5 / 9 / 100) + beyond * (5 / 12 / 100);
    return Math.max(0.7, 1 - reduction);
  }
  // claimAge > fra
  const cappedAge = Math.min(70, claimAge);
  const monthsLate = (cappedAge - fra) * 12;
  return 1 + monthsLate * (8 / 12 / 100);
}
