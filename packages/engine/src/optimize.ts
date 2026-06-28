/**
 * Optimizers built on top of `project()`.
 *
 * - earliestViableRetirement(h): the lowest retirement age that doesn't run
 *   out of money before longevityAge.
 * - optimizeSocialSecurityClaim(h, owner): the claim age 62..70 with the
 *   best lifetime nominal expected SS income.
 */

import type { Household, PersonId } from './types';
import { project } from './project';

export function earliestViableRetirement(h: Household): number {
  // Search 50..targetRetirementAge+10
  const minTry = 50;
  const maxTry = Math.max(h.self.targetRetirementAge + 10, 75);
  let bestSafe: number | undefined;
  for (let age = minTry; age <= maxTry; age++) {
    const candidate: Household = {
      ...h,
      self: { ...h.self, targetRetirementAge: age },
      spouse: h.spouse ? { ...h.spouse, targetRetirementAge: age } : undefined,
    };
    const result = project(candidate);
    if (!result.ranOutOfMoney) {
      bestSafe = age;
      break;
    }
  }
  return bestSafe ?? h.self.targetRetirementAge;
}

export interface SSClaimComparison {
  claimAge: number;
  lifetimeNominalSS: number;
}

export function optimizeSocialSecurityClaim(
  h: Household,
  owner: PersonId,
): { best: SSClaimComparison; all: SSClaimComparison[] } {
  const all: SSClaimComparison[] = [];
  for (let claimAge = 62; claimAge <= 70; claimAge++) {
    const candidate: Household = {
      ...h,
      socialSecurity: h.socialSecurity.map((s) =>
        s.owner === owner ? { ...s, claimAge } : s,
      ),
    };
    const r = project(candidate);
    const lifetime = r.rows.reduce((s, row) => s + row.socialSecurity, 0);
    all.push({ claimAge, lifetimeNominalSS: lifetime });
  }
  const best = all.reduce((a, b) => (b.lifetimeNominalSS > a.lifetimeNominalSS ? b : a));
  return { best, all };
}
