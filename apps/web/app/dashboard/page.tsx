'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  earliestViableRetirement,
  optimizeSocialSecurityClaim,
  project,
  type Account,
} from '@retirement/engine';
import { useHydrateStore, useStore } from '@/lib/store';
import { formatCurrency, withBasePath } from '@/lib/utils';
import { NoHouseholdYet } from '@/components/empty-state';

const ACCOUNT_LABEL: Record<string, string> = {
  '401k': '401(k)',
  '403b': '403(b)',
  roth401k: 'Roth 401(k)',
  tradIRA: 'Traditional IRA',
  rothIRA: 'Roth IRA',
  HSA: 'HSA',
  taxableBrokerage: 'Taxable',
  savings: 'Savings',
  pension: 'Pension',
};

export default function DashboardPage() {
  useHydrateStore();
  const isHydrated = useStore((s) => s.isHydrated);
  const h = useStore((s) => s.household);

  const result = useMemo(() => {
    if (!h) return null;
    const projection = project(h);
    const earliest = earliestViableRetirement(h);
    const ssOpt = optimizeSocialSecurityClaim(h, 'self');
    return { projection, earliest, ssOpt };
  }, [h]);

  if (!isHydrated) return <DashboardSkeleton />;
  if (!h || !result) return <NoHouseholdYet />;

  const { projection, earliest, ssOpt } = result;
  const onTrack = !projection.ranOutOfMoney;
  // First post-retirement year for "monthly income" estimate
  const postRetire = projection.rows.find(
    (r) => r.ageSelf > h.self.targetRetirementAge,
  );
  const monthlyIncomePostRetire = postRetire
    ? Math.round((postRetire.spendActual - postRetire.federalTax) / 12)
    : 0;
  const totalAssets = h.accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* PRIMARY HERO CARD */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Your retirement plan
            </div>
            <span
              className={
                onTrack
                  ? 'inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success text-xs font-medium px-2.5 py-1'
                  : 'inline-flex items-center gap-1.5 rounded-full bg-warn/10 text-warn text-xs font-medium px-2.5 py-1'
              }
            >
              {onTrack ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> On track
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3" /> Shortfall projected
                </>
              )}
            </span>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-end md:gap-12">
            <div>
              <div className="text-sm text-muted-foreground">
                {onTrack
                  ? 'Earliest viable retirement age'
                  : `Target retirement age (plan runs short${
                      projection.ranOutAtAge ? ` at ${projection.ranOutAtAge}` : ''
                    })`}
              </div>
              <div className="hero-numeral text-8xl md:text-9xl leading-none">{earliest}</div>
            </div>
            <div className="md:pb-3 space-y-3 md:border-l md:pl-12 border-border/70">
              <Metric
                label="After-tax monthly income (first retired year)"
                value={formatCurrency(monthlyIncomePostRetire)}
              />
              <Metric label="Money lasts to age" value={String(h.assumptions.longevityAge)} />
              <Metric label="Total household assets today" value={formatCurrency(totalAssets)} />
            </div>
          </div>

          {/* Confidence-by-age bars: simplified — % of trials surviving each age */}
          <div className="mt-10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Portfolio balance through retirement</span>
              <span>Deterministic · Monte Carlo lands in Phase 5</span>
            </div>
            <BalanceSpark rows={projection.rows} />
          </div>
        </div>

        {/* SIDEBAR — SS optimizer + actions */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Social Security · self
            </div>
            <div className="mt-3 text-3xl font-medium hero-numeral">
              Age {ssOpt.best.claimAge}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Best lifetime claim age. Total nominal expected income across the plan window:{' '}
              <span className="text-success font-medium numeral">
                {formatCurrency(ssOpt.best.lifetimeNominalSS, { compact: true })}
              </span>
              .
            </p>
            <Link
              href={withBasePath('/plan/')}
              className="mt-4 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              See full plan <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" /> Update
            </div>
            <div className="mt-3 font-medium">Edit your inputs</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan recomputes immediately when you save.
            </p>
            <Link
              href={withBasePath('/onboarding/')}
              className="mt-4 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              Open onboarding <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Account breakdown */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Total household assets · {formatCurrency(totalAssets)}
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          {summarizeByKind(h.accounts).map((a) => (
            <div key={a.kind}>
              <div className="h-1 rounded-full bg-primary/60" />
              <div className="mt-2 text-sm text-muted-foreground">
                {ACCOUNT_LABEL[a.kind] ?? a.kind}
              </div>
              <div className="text-lg font-medium numeral">{formatCurrency(a.total)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-medium numeral">{value}</div>
    </div>
  );
}

function summarizeByKind(accounts: Account[]): Array<{ kind: string; total: number }> {
  const map = new Map<string, number>();
  for (const a of accounts) {
    map.set(a.kind, (map.get(a.kind) ?? 0) + a.balance);
  }
  return Array.from(map.entries())
    .map(([kind, total]) => ({ kind, total }))
    .sort((a, b) => b.total - a.total);
}

function BalanceSpark({
  rows,
}: {
  rows: Array<{ ageSelf: number; endBalance: number }>;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.endBalance), 1);
  return (
    <div className="mt-3 flex items-end gap-0.5 h-32">
      {rows.map((r) => (
        <div key={r.ageSelf} className="flex-1 flex flex-col items-center">
          <div
            className="w-full rounded-sm bg-primary/70"
            style={{ height: `${Math.max(2, (r.endBalance / max) * 100)}%` }}
            aria-label={`Age ${r.ageSelf}: ${r.endBalance}`}
          />
          {r.ageSelf % 5 === 0 ? (
            <div className="mt-1 text-[9px] text-muted-foreground numeral">{r.ageSelf}</div>
          ) : (
            <div className="mt-1 h-[10px]" />
          )}
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="animate-pulse space-y-6">
        <div className="h-64 rounded-2xl bg-muted" />
        <div className="h-32 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
