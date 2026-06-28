import { describe, expect, it } from 'vitest';
import {
  FEDERAL_BRACKETS_2026,
  federalTax,
  rmdStartAge,
  socialSecurityFRA,
  ssClaimAdjustment,
  ultDivisor,
} from '../src/reference';

describe('federalTax', () => {
  it('returns 0 for non-positive income', () => {
    expect(federalTax(0, FEDERAL_BRACKETS_2026.single)).toBe(0);
    expect(federalTax(-1000, FEDERAL_BRACKETS_2026.single)).toBe(0);
  });

  it('only applies the 10% bracket below the first threshold (single)', () => {
    // first bracket: up to 11,800 at 10%
    expect(federalTax(10000, FEDERAL_BRACKETS_2026.single)).toBeCloseTo(1000, 0);
  });

  it('stacks brackets correctly at 50k MFJ', () => {
    // mfj: 10% to 23,600, then 12% to 96,000
    // 50,000 → 23,600*0.10 + (50,000-23,600)*0.12 = 2,360 + 3,168 = 5,528
    expect(federalTax(50000, FEDERAL_BRACKETS_2026.mfj)).toBeCloseTo(5528, 0);
  });
});

describe('rmdStartAge', () => {
  it('returns 73 for SECURE 2.0 cohort (1951-1959)', () => {
    expect(rmdStartAge(1955)).toBe(73);
    expect(rmdStartAge(1959)).toBe(73);
  });
  it('returns 75 for those born 1960 or later', () => {
    expect(rmdStartAge(1960)).toBe(75);
    expect(rmdStartAge(1985)).toBe(75);
  });
});

describe('socialSecurityFRA', () => {
  it('is 67 for those born 1960+', () => {
    expect(socialSecurityFRA(1960)).toBe(67);
    expect(socialSecurityFRA(1990)).toBe(67);
  });
});

describe('ssClaimAdjustment', () => {
  it('is 1.0 at FRA', () => {
    expect(ssClaimAdjustment(67, 67)).toBe(1.0);
  });
  it('reduces at 62 by ~30% for FRA=67', () => {
    // 5/9% per month for first 36 months, 5/12% per month for next 24
    // 36 * 5/9 = 20%; 24 * 5/12 = 10%; total 30% reduction → 0.70
    expect(ssClaimAdjustment(62, 67)).toBeCloseTo(0.7, 2);
  });
  it('grows by 8%/yr beyond FRA up to age 70', () => {
    expect(ssClaimAdjustment(70, 67)).toBeCloseTo(1.24, 2);
  });
  it('caps growth at age 70', () => {
    expect(ssClaimAdjustment(72, 67)).toBeCloseTo(1.24, 2);
  });
});

describe('ultDivisor', () => {
  it('returns Infinity below 72 (no RMD)', () => {
    expect(ultDivisor(71)).toBe(Infinity);
  });
  it('returns the published divisor at 75', () => {
    expect(ultDivisor(75)).toBe(24.6);
  });
});
