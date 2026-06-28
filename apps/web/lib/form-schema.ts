/**
 * Zod schema for the onboarding form. The shape is flatter and friendlier
 * to a form library than `Household` (e.g., we ask for "% equity" as a
 * percent, not 0..1). `toHousehold()` translates form values to the engine
 * domain type at submit time.
 */

import { z } from 'zod';
import {
  DEFAULT_ASSUMPTIONS,
  type AccountKind,
  type FilingStatus,
  type Household,
  type USState,
} from '@retirement/engine';

const accountKinds = [
  '401k',
  '403b',
  'roth401k',
  'tradIRA',
  'rothIRA',
  'HSA',
  'taxableBrokerage',
  'savings',
  'pension',
] as const satisfies readonly AccountKind[];

const filingStatuses = ['single', 'mfj', 'mfs', 'hoh'] as const satisfies readonly FilingStatus[];

const usStates: USState[] = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

export const accountSchema = z.object({
  id: z.string(),
  owner: z.enum(['self', 'spouse', 'joint']),
  kind: z.enum(accountKinds),
  balance: z.coerce.number().nonnegative(),
  annualContribution: z.coerce.number().nonnegative().optional(),
  employerMatch: z.coerce.number().nonnegative().optional(),
});

export const formSchema = z.object({
  hasSpouse: z.boolean(),
  filingStatus: z.enum(filingStatuses),
  state: z.enum(usStates as [USState, ...USState[]]),

  selfBirthYear: z.coerce.number().int().min(1920).max(2010),
  selfIncome: z.coerce.number().nonnegative(),
  selfRetireAge: z.coerce.number().int().min(50).max(80),
  selfPiaMonthly: z.coerce.number().nonnegative(),
  selfClaimAge: z.coerce.number().int().min(62).max(70),

  spouseBirthYear: z.coerce.number().int().min(1920).max(2010).optional(),
  spouseIncome: z.coerce.number().nonnegative().optional(),
  spouseRetireAge: z.coerce.number().int().min(50).max(80).optional(),
  spousePiaMonthly: z.coerce.number().nonnegative().optional(),
  spouseClaimAge: z.coerce.number().int().min(62).max(70).optional(),

  accounts: z.array(accountSchema).min(1, 'Add at least one account'),

  annualSpend: z.coerce.number().positive(),
  longevityAge: z.coerce.number().int().min(70).max(110),
  equityPct: z.coerce.number().min(0).max(100),
});

export type FormInput = z.input<typeof formSchema>;
export type FormValues = z.output<typeof formSchema>;

export const defaultFormValues: FormValues = {
  hasSpouse: false,
  filingStatus: 'single',
  state: 'CA',
  selfBirthYear: 1970,
  selfIncome: 150000,
  selfRetireAge: 65,
  selfPiaMonthly: 2800,
  selfClaimAge: 67,
  accounts: [
    { id: 'a1', owner: 'self', kind: '401k', balance: 500000, annualContribution: 23000, employerMatch: 8000 },
    { id: 'a2', owner: 'self', kind: 'rothIRA', balance: 120000, annualContribution: 7500 },
    { id: 'a3', owner: 'self', kind: 'taxableBrokerage', balance: 200000 },
  ],
  annualSpend: 90000,
  longevityAge: 95,
  equityPct: 70,
};

export const sampleFormValues: FormValues = {
  hasSpouse: true,
  filingStatus: 'mfj',
  state: 'CA',
  selfBirthYear: 1968,
  selfIncome: 180000,
  selfRetireAge: 65,
  selfPiaMonthly: 3100,
  selfClaimAge: 70,
  spouseBirthYear: 1970,
  spouseIncome: 95000,
  spouseRetireAge: 65,
  spousePiaMonthly: 2100,
  spouseClaimAge: 67,
  accounts: [
    { id: 's1', owner: 'self', kind: '401k', balance: 720000, annualContribution: 23000, employerMatch: 10500 },
    { id: 's2', owner: 'self', kind: 'tradIRA', balance: 210000 },
    { id: 's3', owner: 'self', kind: 'rothIRA', balance: 145000, annualContribution: 7500 },
    { id: 's4', owner: 'spouse', kind: '401k', balance: 320000, annualContribution: 18000, employerMatch: 7000 },
    { id: 's5', owner: 'spouse', kind: 'rothIRA', balance: 70000 },
    { id: 's6', owner: 'joint', kind: 'taxableBrokerage', balance: 380000 },
    { id: 's7', owner: 'joint', kind: 'HSA', balance: 117000, annualContribution: 8000 },
  ],
  annualSpend: 110000,
  longevityAge: 95,
  equityPct: 70,
};

export function toHousehold(v: FormValues): Household {
  return {
    self: {
      id: 'self',
      birthYear: v.selfBirthYear,
      currentAnnualIncome: v.selfIncome,
      targetRetirementAge: v.selfRetireAge,
    },
    spouse: v.hasSpouse && v.spouseBirthYear
      ? {
          id: 'spouse',
          birthYear: v.spouseBirthYear,
          currentAnnualIncome: v.spouseIncome ?? 0,
          targetRetirementAge: v.spouseRetireAge ?? 65,
        }
      : undefined,
    filingStatus: v.filingStatus,
    state: v.state,
    accounts: v.accounts.map((a) => ({
      id: a.id,
      owner: a.owner,
      kind: a.kind,
      balance: a.balance,
      annualContribution: a.annualContribution,
      employerMatch: a.employerMatch,
    })),
    socialSecurity: [
      { owner: 'self', piaMonthly: v.selfPiaMonthly, claimAge: v.selfClaimAge },
      ...(v.hasSpouse && v.spousePiaMonthly !== undefined && v.spouseClaimAge !== undefined
        ? [{ owner: 'spouse' as const, piaMonthly: v.spousePiaMonthly, claimAge: v.spouseClaimAge }]
        : []),
    ],
    spend: { annualSpend: v.annualSpend },
    assumptions: {
      ...DEFAULT_ASSUMPTIONS,
      longevityAge: v.longevityAge,
      startingEquityWeight: v.equityPct / 100,
    },
  };
}
