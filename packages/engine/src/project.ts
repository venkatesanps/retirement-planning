/**
 * Year-by-year retirement projection.
 *
 * Pure function: same input → same output. No I/O, no Date.now(), no random.
 * `currentYear` is passed in so tests are deterministic.
 *
 * Algorithm per year:
 *   1. Age each person. Determine retirement status.
 *   2. While working: contribute to retirement accounts.
 *   3. Apply growth (real return + inflation) to every account.
 *   4. Compute income: wages (if working), SS (if claimed), pension (if started).
 *   5. Compute spend target (inflation-adjusted) + one-time expenses.
 *   6. Required withdrawals = max(0, spendTarget + taxes − income).
 *      Subject to RMD floor for tax-deferred accounts.
 *   7. Pull from accounts in tax-aware order:
 *        taxable → tax-deferred → tax-free.
 *      RMDs forced from tax-deferred even if not needed for spend.
 *   8. Compute taxes (federal first cut; state TBD Phase 4).
 *   9. Record YearRow.
 */

import type {
  Account,
  Household,
  Projection,
  TaxBucket,
  YearRow,
  AccountSnapshot,
} from './types';
import {
  FEDERAL_BRACKETS_2026,
  STANDARD_DEDUCTION_2026,
  federalTax,
  rmdStartAge,
  socialSecurityFRA,
  ssClaimAdjustment,
  ultDivisor,
} from './reference';

export interface ProjectOptions {
  /** Calendar year to start the projection. Defaults to UTC current year. */
  currentYear?: number;
}

/** Map account kind to its tax bucket for the withdrawal sequencer. */
function bucketOf(account: Account): TaxBucket {
  switch (account.kind) {
    case '401k':
    case '403b':
    case 'tradIRA':
      return 'taxDeferred';
    case 'roth401k':
    case 'rothIRA':
      return 'taxFree';
    case 'HSA':
      return 'hsa';
    case 'taxableBrokerage':
    case 'savings':
      return 'taxable';
    case 'pension':
      // Pension is income-stream only; balance not drawn from
      return 'taxDeferred';
  }
}

/** Real-return weighted by equity weight; returns nominal growth multiplier. */
function annualGrowthMultiplier(
  inflation: number,
  realEquity: number,
  realBond: number,
  equityWeight: number,
): number {
  const realBlend = equityWeight * realEquity + (1 - equityWeight) * realBond;
  return (1 + realBlend) * (1 + inflation);
}

/** Linear glidepath helper. */
function equityWeightForYear(
  yearsIn: number,
  totalYears: number,
  startWeight: number,
  endWeight: number | undefined,
): number {
  if (endWeight === undefined || totalYears <= 0) return startWeight;
  const t = Math.min(1, yearsIn / totalYears);
  return startWeight + (endWeight - startWeight) * t;
}

interface MutableAccount extends Account {
  _balance: number;
  _basis: number;
}

function snapshot(accts: MutableAccount[]): AccountSnapshot[] {
  return accts
    .filter((a) => a.kind !== 'pension')
    .map((a) => ({ id: a.id, kind: a.kind, balance: round(a._balance) }));
}

function round(n: number): number {
  return Math.round(n);
}

/**
 * Withdraw `target` from the given accounts in order; returns actual amount
 * pulled and updates account balances. Stops when target is met or all
 * accounts in the bucket are empty.
 */
function withdrawFromBucket(
  accounts: MutableAccount[],
  bucket: TaxBucket,
  target: number,
): number {
  if (target <= 0) return 0;
  let remaining = target;
  for (const a of accounts) {
    if (bucketOf(a) !== bucket) continue;
    if (a._balance <= 0) continue;
    const take = Math.min(a._balance, remaining);
    a._balance -= take;
    if (bucket === 'taxable') {
      // basis withdraws proportionally
      const basisShare = a._basis * (take / (take + a._balance + 1e-9));
      a._basis = Math.max(0, a._basis - basisShare);
    }
    remaining -= take;
    if (remaining <= 0) break;
  }
  return target - remaining;
}

export function project(h: Household, opts: ProjectOptions = {}): Projection {
  const currentYear = opts.currentYear ?? new Date().getUTCFullYear();
  const longevity = h.assumptions.longevityAge;

  // Person ages
  const ageSelf0 = currentYear - h.self.birthYear;
  const yearsTotal = longevity - ageSelf0;
  if (yearsTotal <= 0) return { rows: [], ranOutOfMoney: false };

  // Clone accounts (mutable state across years)
  const accts: MutableAccount[] = h.accounts.map((a) => ({
    ...a,
    _balance: a.balance,
    _basis: a.costBasis ?? a.balance,
  }));

  const rows: YearRow[] = [];
  let ranOutAt: number | undefined;

  for (let y = 0; y < yearsTotal; y++) {
    const year = currentYear + y;
    const ageSelf = ageSelf0 + y + 1; // age at year-end
    const ageSpouse = h.spouse ? year - h.spouse.birthYear + 1 : undefined;

    const selfWorking = ageSelf <= h.self.targetRetirementAge;
    const spouseWorking =
      h.spouse !== undefined && ageSpouse !== undefined
        ? ageSpouse <= h.spouse.targetRetirementAge
        : false;

    // 1) Contributions while working
    for (const a of accts) {
      if (a.kind === 'pension') continue;
      const ownerWorking =
        a.owner === 'self' ? selfWorking : a.owner === 'spouse' ? spouseWorking : selfWorking || spouseWorking;
      if (ownerWorking && a.annualContribution) {
        a._balance += a.annualContribution;
        if (bucketOf(a) === 'taxable') a._basis += a.annualContribution;
      }
      if (ownerWorking && a.employerMatch && (a.kind === '401k' || a.kind === '403b')) {
        a._balance += a.employerMatch;
      }
    }

    // 2) Growth
    const equityWeight = equityWeightForYear(
      y,
      yearsTotal,
      h.assumptions.startingEquityWeight,
      h.assumptions.endingEquityWeight,
    );
    const growth = annualGrowthMultiplier(
      h.assumptions.inflation,
      h.assumptions.realEquityReturn,
      h.assumptions.realBondReturn,
      equityWeight,
    );
    for (const a of accts) {
      if (a.kind === 'pension') continue;
      a._balance *= growth;
      if (bucketOf(a) === 'taxable') a._basis *= 1 + h.assumptions.inflation; // basis indexed for our purposes
    }

    // 3) Income — nominal $ this year
    const inflationFactor = Math.pow(1 + h.assumptions.inflation, y + 1);
    let wages = 0;
    if (selfWorking) wages += h.self.currentAnnualIncome * inflationFactor;
    if (spouseWorking && h.spouse) wages += h.spouse.currentAnnualIncome * inflationFactor;

    // Social Security
    let ssIncome = 0;
    for (const ss of h.socialSecurity) {
      const person = ss.owner === 'self' ? h.self : h.spouse;
      if (!person) continue;
      const age = year - person.birthYear + 1;
      if (age < ss.claimAge) continue;
      const fra = socialSecurityFRA(person.birthYear);
      const adj = ssClaimAdjustment(ss.claimAge, fra);
      // SS COLA approximated as inflation; PIA is in today's $
      const yearsClaimed = age - ss.claimAge;
      const monthly = ss.piaMonthly * adj * Math.pow(1 + h.assumptions.inflation, yearsClaimed + (currentYear - person.birthYear - ageSelf0));
      ssIncome += monthly * 12;
    }

    // Pension
    let pensionIncome = 0;
    for (const a of accts) {
      if (a.kind !== 'pension' || !a.pensionMonthly || !a.pensionStartAge) continue;
      const owner = a.owner === 'self' ? h.self : a.owner === 'spouse' ? h.spouse : h.self;
      if (!owner) continue;
      const age = year - owner.birthYear + 1;
      if (age >= a.pensionStartAge) {
        // pensions in today's $; not COLA'd unless modeled
        pensionIncome += a.pensionMonthly * 12;
      }
    }

    // 4) Spend target (inflation-adjusted) plus any one-time
    let spendTarget = h.spend.annualSpend * inflationFactor;
    if (h.spend.oneTime) {
      for (const e of h.spend.oneTime) if (e.year === year) spendTarget += e.amount;
    }

    // 5) RMDs (forced from tax-deferred this year, computed on prior year-end balance)
    let rmdRequired = 0;
    const rmdAgeSelf = rmdStartAge(h.self.birthYear);
    const rmdAgeSpouse = h.spouse ? rmdStartAge(h.spouse.birthYear) : Infinity;
    for (const a of accts) {
      if (bucketOf(a) !== 'taxDeferred' || a.kind === 'pension') continue;
      const owner = a.owner === 'self' ? h.self : a.owner === 'spouse' ? h.spouse : h.self;
      if (!owner) continue;
      const age = year - owner.birthYear + 1;
      const rmdAge = owner.id === 'self' ? rmdAgeSelf : rmdAgeSpouse;
      if (age >= rmdAge) {
        const div = ultDivisor(age);
        rmdRequired += a._balance / div;
      }
    }

    // 6) Cash gap to fund
    const grossIncome = wages + ssIncome + pensionIncome;
    // First-pass tax estimate at current marginal: assume taxable portion = wages + ssIncome*0.85 + pensionIncome
    const taxableSS = ssIncome * 0.85; // simplification; provisional-income rules deferred to Phase 4
    let taxableIncomePreWD = wages + taxableSS + pensionIncome;

    const std = STANDARD_DEDUCTION_2026[h.filingStatus] * inflationFactor;

    // Initial withdrawal need to cover spend
    const needBeforeTax = Math.max(0, spendTarget - grossIncome);
    // First pass withdrawals: cover needBeforeTax plus RMD
    const withdrawForce = Math.max(needBeforeTax, rmdRequired);

    // Pull withdrawals in tax-aware order, RMD first from tax-deferred
    let wdTaxDeferred = 0;
    if (rmdRequired > 0) {
      wdTaxDeferred += withdrawFromBucket(accts, 'taxDeferred', rmdRequired);
    }
    let leftover = Math.max(0, withdrawForce - wdTaxDeferred);
    const wdTaxable = withdrawFromBucket(accts, 'taxable', leftover);
    leftover -= wdTaxable;
    const wdTaxDeferredExtra = withdrawFromBucket(accts, 'taxDeferred', leftover);
    wdTaxDeferred += wdTaxDeferredExtra;
    leftover -= wdTaxDeferredExtra;
    const wdTaxFree = withdrawFromBucket(accts, 'taxFree', leftover);
    leftover -= wdTaxFree;

    // 7) Taxes — recompute including withdrawal-driven taxable income
    // wdTaxable is mostly cap-gains-eligible: approximate 50% is gain (Phase 4 will track basis precisely)
    const capGainsPortion = wdTaxable * 0.5;
    const ordinaryFromWD = wdTaxDeferred; // all ordinary
    taxableIncomePreWD += ordinaryFromWD;
    const taxableIncome = Math.max(0, taxableIncomePreWD - std);
    const fedTax = federalTax(taxableIncome, FEDERAL_BRACKETS_2026[h.filingStatus]);
    // crude LTCG: assume 15% on cap gains (Phase 4 will bracket-aware this)
    const fedTaxLTCG = capGainsPortion * 0.15;
    const federalTaxTotal = fedTax + fedTaxLTCG;
    const stateTaxTotal = 0; // Phase 4

    // If taxes plus spend exceed what we withdrew + income, top up from taxable→trad→roth
    const cashNeeded = spendTarget + federalTaxTotal + stateTaxTotal;
    const cashOnHand = grossIncome + wdTaxable + wdTaxDeferred + wdTaxFree;
    let shortfall = 0;
    let extraWD = 0;
    if (cashOnHand < cashNeeded) {
      const gap = cashNeeded - cashOnHand;
      const extraTaxable = withdrawFromBucket(accts, 'taxable', gap);
      let remainingGap = gap - extraTaxable;
      const extraTD = withdrawFromBucket(accts, 'taxDeferred', remainingGap);
      remainingGap -= extraTD;
      const extraTF = withdrawFromBucket(accts, 'taxFree', remainingGap);
      remainingGap -= extraTF;
      extraWD = extraTaxable + extraTD + extraTF;
      if (remainingGap > 0) {
        shortfall = remainingGap;
        if (ranOutAt === undefined) ranOutAt = ageSelf;
      }
    }
    const spendActual = spendTarget - shortfall;

    const endBalance = accts.reduce((s, a) => s + (a.kind === 'pension' ? 0 : a._balance), 0);

    rows.push({
      year,
      ageSelf,
      ageSpouse,
      wages: round(wages),
      socialSecurity: round(ssIncome),
      pension: round(pensionIncome),
      withdrawTaxable: round(wdTaxable),
      withdrawTaxDeferred: round(wdTaxDeferred),
      withdrawTaxFree: round(wdTaxFree),
      rmdRequired: round(rmdRequired),
      federalTax: round(federalTaxTotal),
      stateTax: round(stateTaxTotal),
      spendTarget: round(spendTarget),
      spendActual: round(spendActual),
      shortfall: round(shortfall),
      endBalance: round(endBalance),
      accounts: snapshot(accts),
    });
  }

  return {
    rows,
    ranOutOfMoney: ranOutAt !== undefined,
    ranOutAtAge: ranOutAt,
  };
}
