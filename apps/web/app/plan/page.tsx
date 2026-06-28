'use client';

import { useMemo, useState } from 'react';
import { project, type YearRow } from '@retirement/engine';
import { useHydrateStore, useStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { NoHouseholdYet } from '@/components/empty-state';

export default function PlanPage() {
  useHydrateStore();
  const isHydrated = useStore((s) => s.isHydrated);
  const h = useStore((s) => s.household);
  const [showAllYears, setShowAllYears] = useState(false);

  const projection = useMemo(() => (h ? project(h) : null), [h]);

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }
  if (!h || !projection) return <NoHouseholdYet />;

  const rows = showAllYears
    ? projection.rows
    : projection.rows.filter((r, i, all) => {
        // Show every year up to retirement+2, then every 5 years
        const retire = h.self.targetRetirementAge;
        if (r.ageSelf <= retire + 2) return true;
        if (r.ageSelf % 5 === 0) return true;
        if (i === all.length - 1) return true;
        return false;
      });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-wider text-primary font-medium">Year-by-year</div>
        <h1 className="mt-2 text-4xl tracking-tight font-medium">Your retirement plan</h1>
        <p className="mt-2 text-muted-foreground">
          Ages {projection.rows[0]?.ageSelf} → {h.assumptions.longevityAge}. All amounts are nominal
          dollars (inflated forward).
        </p>
      </header>

      {/* Chart */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="p-6 border-b border-border/60">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>End-of-year portfolio balance</span>
            <span>{projection.ranOutOfMoney ? `Runs out at age ${projection.ranOutAtAge}` : 'Self-sustaining'}</span>
          </div>
          <BalanceChart rows={projection.rows} />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-card/70 backdrop-blur sticky top-0">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-medium">Age</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium text-right">Wages</th>
                <th className="px-4 py-3 font-medium text-right">SS</th>
                <th className="px-4 py-3 font-medium text-right">Pension</th>
                <th className="px-4 py-3 font-medium text-right">Taxable</th>
                <th className="px-4 py-3 font-medium text-right">Trad</th>
                <th className="px-4 py-3 font-medium text-right">Roth</th>
                <th className="px-4 py-3 font-medium text-right">RMD</th>
                <th className="px-4 py-3 font-medium text-right">Tax</th>
                <th className="px-4 py-3 font-medium text-right">Spend</th>
                <th className="px-4 py-3 font-medium text-right">End balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((r) => (
                <Row key={r.year} r={r} retireAge={h.self.targetRetirementAge} />
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 text-xs text-muted-foreground border-t border-border/60 flex justify-between items-center">
          <span>
            Showing {rows.length} of {projection.rows.length} years
          </span>
          <button
            type="button"
            onClick={() => setShowAllYears((v) => !v)}
            className="text-primary hover:underline"
          >
            {showAllYears ? 'Show key years only' : 'Show every year'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ r, retireAge }: { r: YearRow; retireAge: number }) {
  const highlight = r.ageSelf === retireAge ? 'bg-primary/[0.05]' : '';
  const shortfall = r.shortfall > 0;
  return (
    <tr className={`hover:bg-muted/40 ${highlight} ${shortfall ? 'text-danger' : ''}`}>
      <td className="px-4 py-3 font-medium numeral">{r.ageSelf}</td>
      <td className="px-4 py-3 text-muted-foreground numeral">{r.year}</td>
      <td className="px-4 py-3 text-right numeral">{cell(r.wages)}</td>
      <td className="px-4 py-3 text-right numeral">{cell(r.socialSecurity)}</td>
      <td className="px-4 py-3 text-right numeral">{cell(r.pension)}</td>
      <td className="px-4 py-3 text-right numeral">{cell(r.withdrawTaxable)}</td>
      <td className="px-4 py-3 text-right numeral">{cell(r.withdrawTaxDeferred)}</td>
      <td className="px-4 py-3 text-right numeral">{cell(r.withdrawTaxFree)}</td>
      <td className="px-4 py-3 text-right numeral text-muted-foreground">{cell(r.rmdRequired)}</td>
      <td className="px-4 py-3 text-right numeral text-muted-foreground">{cell(r.federalTax)}</td>
      <td className="px-4 py-3 text-right numeral">{cell(r.spendActual)}</td>
      <td className="px-4 py-3 text-right font-medium numeral">{cell(r.endBalance)}</td>
    </tr>
  );
}

function cell(n: number): string {
  return n > 0 ? formatCurrency(n, { compact: true }) : '—';
}

function BalanceChart({ rows }: { rows: YearRow[] }) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.endBalance), 1);
  return (
    <div className="mt-4 flex items-end gap-0.5 h-48">
      {rows.map((r) => (
        <div key={r.year} className="flex-1 flex flex-col items-center justify-end h-full">
          <div
            className={r.shortfall > 0 ? 'w-full bg-danger/80 rounded-sm' : 'w-full bg-primary/70 rounded-sm'}
            style={{ height: `${Math.max(1, (r.endBalance / max) * 100)}%` }}
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
