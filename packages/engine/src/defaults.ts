import type { Assumptions, Household } from './types';

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  inflation: 0.025,
  realEquityReturn: 0.05, // ~7.5% nominal at 2.5% inflation
  realBondReturn: 0.015,
  startingEquityWeight: 0.7,
  endingEquityWeight: 0.4,
  longevityAge: 95,
};

/** A sample household used for demos and tests. */
export function sampleHousehold(): Household {
  return {
    self: {
      id: 'self',
      birthYear: 1968,
      currentAnnualIncome: 180000,
      targetRetirementAge: 65,
    },
    spouse: {
      id: 'spouse',
      birthYear: 1970,
      currentAnnualIncome: 95000,
      targetRetirementAge: 65,
    },
    filingStatus: 'mfj',
    state: 'CA',
    accounts: [
      { id: 'self-401k', owner: 'self', kind: '401k', balance: 720000, annualContribution: 23000, employerMatch: 10500 },
      { id: 'self-trad-ira', owner: 'self', kind: 'tradIRA', balance: 210000 },
      { id: 'self-roth', owner: 'self', kind: 'rothIRA', balance: 145000, annualContribution: 7500 },
      { id: 'spouse-401k', owner: 'spouse', kind: '401k', balance: 320000, annualContribution: 18000, employerMatch: 7000 },
      { id: 'spouse-roth', owner: 'spouse', kind: 'rothIRA', balance: 70000 },
      { id: 'joint-taxable', owner: 'joint', kind: 'taxableBrokerage', balance: 380000, costBasis: 250000 },
      { id: 'joint-hsa', owner: 'joint', kind: 'HSA', balance: 117000, annualContribution: 8000 },
    ],
    socialSecurity: [
      { owner: 'self', piaMonthly: 3100, claimAge: 70 },
      { owner: 'spouse', piaMonthly: 2100, claimAge: 67 },
    ],
    spend: {
      annualSpend: 110000,
    },
    assumptions: DEFAULT_ASSUMPTIONS,
  };
}
