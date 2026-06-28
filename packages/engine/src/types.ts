/**
 * Engine domain types.
 *
 * All money is USD, stored as plain `number`. Inflation-adjustment is a property
 * of how the value was computed, not encoded into the type. We document units
 * in field names where ambiguity is possible (e.g., `monthlySpend` vs
 * `annualSpend`).
 *
 * The household is designed for one or two people (`self` + optional `spouse`)
 * from day one, because retrofitting joint planning later would require a
 * schema rewrite.
 */

export type PersonId = 'self' | 'spouse';

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';

export type USState =
  | 'AL' | 'AK' | 'AZ' | 'AR' | 'CA' | 'CO' | 'CT' | 'DE' | 'FL' | 'GA'
  | 'HI' | 'ID' | 'IL' | 'IN' | 'IA' | 'KS' | 'KY' | 'LA' | 'ME' | 'MD'
  | 'MA' | 'MI' | 'MN' | 'MS' | 'MO' | 'MT' | 'NE' | 'NV' | 'NH' | 'NJ'
  | 'NM' | 'NY' | 'NC' | 'ND' | 'OH' | 'OK' | 'OR' | 'PA' | 'RI' | 'SC'
  | 'SD' | 'TN' | 'TX' | 'UT' | 'VT' | 'VA' | 'WA' | 'WV' | 'WI' | 'WY' | 'DC';

export interface Person {
  id: PersonId;
  birthYear: number; // 4-digit
  currentAnnualIncome: number;
  targetRetirementAge: number;
}

export type AccountKind =
  | '401k'
  | '403b'
  | 'roth401k'
  | 'tradIRA'
  | 'rothIRA'
  | 'HSA'
  | 'taxableBrokerage'
  | 'savings'
  | 'pension';

/**
 * Tax-treatment grouping for the withdrawal sequencer.
 * - taxable: cap-gains on growth above basis; dividends taxed yearly
 * - taxDeferred: ordinary income on withdrawal; RMDs apply
 * - taxFree: Roth; no tax on qualified withdrawal; no RMDs (Roth 401k RMDs now eliminated)
 * - hsa: tax-free for qualified medical; ordinary income otherwise after 65
 */
export type TaxBucket = 'taxable' | 'taxDeferred' | 'taxFree' | 'hsa';

export interface Account {
  id: string;
  owner: PersonId | 'joint';
  kind: AccountKind;
  balance: number;
  costBasis?: number; // taxable only; defaults to balance if omitted
  annualContribution?: number; // employee, while working
  employerMatch?: number; // 401k/403b only
  /** Pension monthly benefit; required when kind === 'pension'. */
  pensionMonthly?: number;
  pensionStartAge?: number;
}

export interface SocialSecurity {
  owner: PersonId;
  /** Primary Insurance Amount at full retirement age, monthly. */
  piaMonthly: number;
  claimAge: number; // 62..70
}

export interface Assumptions {
  /** Annual general inflation, e.g. 0.025 = 2.5%. */
  inflation: number;
  /** Real (above-inflation) return on equity portion. */
  realEquityReturn: number;
  /** Real return on fixed-income portion. */
  realBondReturn: number;
  /** Equity weight 0..1; glidepath applied per year if `glidepath` set. */
  startingEquityWeight: number;
  /** Optional simple glidepath: equity weight at longevityAge. */
  endingEquityWeight?: number;
  longevityAge: number;
}

export interface SpendPlan {
  /** Annual spend in today's dollars, post-retirement. */
  annualSpend: number;
  /** Optional one-time future expenses (year is absolute year, e.g. 2035). */
  oneTime?: Array<{ year: number; amount: number; label?: string }>;
}

export interface Household {
  self: Person;
  spouse?: Person;
  filingStatus: FilingStatus;
  state: USState;
  accounts: Account[];
  socialSecurity: SocialSecurity[];
  spend: SpendPlan;
  assumptions: Assumptions;
}

// ── Projection output ─────────────────────────────────────────────────────────

export interface AccountSnapshot {
  id: string;
  kind: AccountKind;
  balance: number;
}

export interface YearRow {
  /** Calendar year. */
  year: number;
  /** Age of `self` at year-end. */
  ageSelf: number;
  /** Age of `spouse` at year-end (undefined if no spouse). */
  ageSpouse?: number;

  // Income (nominal $ for this year)
  wages: number;
  socialSecurity: number;
  pension: number;

  // Withdrawals (nominal $)
  withdrawTaxable: number;
  withdrawTaxDeferred: number;
  withdrawTaxFree: number;

  // RMD forced amount (subset of withdrawTaxDeferred)
  rmdRequired: number;

  // Taxes (nominal $)
  federalTax: number;
  stateTax: number;

  // Spending target (nominal $ for this year, after inflation)
  spendTarget: number;
  /** Actual spend; equals spendTarget unless we ran out of money. */
  spendActual: number;

  /** Total cash gap not covered by any source. */
  shortfall: number;

  /** End-of-year total portfolio value (sum of all accounts). */
  endBalance: number;

  /** End-of-year balance per account, for the table view. */
  accounts: AccountSnapshot[];
}

export interface Projection {
  rows: YearRow[];
  /** True if any year had a shortfall before longevityAge. */
  ranOutOfMoney: boolean;
  /** Age at which money first ran out, if any. */
  ranOutAtAge?: number;
}
