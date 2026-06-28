import { describe, expect, it } from 'vitest';
import { project } from '../src/project';
import { sampleHousehold, DEFAULT_ASSUMPTIONS } from '../src/defaults';
import type { Household } from '../src/types';

const CURRENT_YEAR = 2026;

describe('project()', () => {
  it('returns one row per year up to longevity', () => {
    const h = sampleHousehold();
    const r = project(h, { currentYear: CURRENT_YEAR });
    // self born 1968, longevity 95 → 1968+95=2063; rows 2026..2062 = 37 rows
    expect(r.rows.length).toBe(95 - (CURRENT_YEAR - 1968));
  });

  it('first row reflects working age, no SS, wages present', () => {
    const h = sampleHousehold();
    const r = project(h, { currentYear: CURRENT_YEAR });
    const first = r.rows[0]!;
    expect(first.year).toBe(CURRENT_YEAR);
    expect(first.ageSelf).toBe(CURRENT_YEAR - 1968 + 1);
    expect(first.wages).toBeGreaterThan(0);
    expect(first.socialSecurity).toBe(0);
  });

  it('post-retirement year has zero wages and >0 withdrawals', () => {
    const h = sampleHousehold();
    const r = project(h, { currentYear: CURRENT_YEAR });
    // Both spouses retire at 65. Self born 1968 retires 2033; spouse born 1970 retires 2035.
    // Year 2036 is the first full calendar year with both fully retired.
    const post = r.rows.find((row) => row.year === 2036);
    expect(post).toBeTruthy();
    expect(post!.wages).toBe(0);
    const totalWD = post!.withdrawTaxable + post!.withdrawTaxDeferred + post!.withdrawTaxFree;
    expect(totalWD).toBeGreaterThan(0);
  });

  it('Social Security kicks in at claim age', () => {
    const h = sampleHousehold();
    const r = project(h, { currentYear: CURRENT_YEAR });
    // self claim age = 70; birthYear 1968 → year 2038
    const ss70 = r.rows.find((row) => row.year === 2038);
    expect(ss70).toBeTruthy();
    expect(ss70!.socialSecurity).toBeGreaterThan(0);
  });

  it('RMDs are nonzero at age 75 for self born 1968', () => {
    const h = sampleHousehold();
    const r = project(h, { currentYear: CURRENT_YEAR });
    const rmdYear = r.rows.find((row) => row.ageSelf === 75);
    expect(rmdYear).toBeTruthy();
    expect(rmdYear!.rmdRequired).toBeGreaterThan(0);
  });

  it('an obviously underfunded household runs out of money', () => {
    const h: Household = {
      self: { id: 'self', birthYear: 1965, currentAnnualIncome: 50000, targetRetirementAge: 62 },
      filingStatus: 'single',
      state: 'CA',
      accounts: [
        { id: 'a', owner: 'self', kind: '401k', balance: 50000 },
      ],
      socialSecurity: [{ owner: 'self', piaMonthly: 1500, claimAge: 67 }],
      spend: { annualSpend: 80000 },
      assumptions: DEFAULT_ASSUMPTIONS,
    };
    const r = project(h, { currentYear: CURRENT_YEAR });
    expect(r.ranOutOfMoney).toBe(true);
    expect(r.ranOutAtAge).toBeGreaterThan(62);
    expect(r.ranOutAtAge).toBeLessThan(95);
  });

  it('a clearly overfunded household never runs out', () => {
    const h: Household = {
      self: { id: 'self', birthYear: 1965, currentAnnualIncome: 0, targetRetirementAge: 62 },
      filingStatus: 'single',
      state: 'WA',
      accounts: [{ id: 'a', owner: 'self', kind: 'rothIRA', balance: 5_000_000 }],
      socialSecurity: [{ owner: 'self', piaMonthly: 2500, claimAge: 67 }],
      spend: { annualSpend: 80000 },
      assumptions: DEFAULT_ASSUMPTIONS,
    };
    const r = project(h, { currentYear: CURRENT_YEAR });
    expect(r.ranOutOfMoney).toBe(false);
  });

  it('end balance monotonically tracked per row', () => {
    const h = sampleHousehold();
    const r = project(h, { currentYear: CURRENT_YEAR });
    for (const row of r.rows) {
      expect(row.endBalance).toBeGreaterThanOrEqual(0);
    }
  });
});
