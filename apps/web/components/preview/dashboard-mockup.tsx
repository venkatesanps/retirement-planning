import { ArrowUpRight, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const TIMELINE_PROBABILITIES = [
  { age: 60, pct: 100 },
  { age: 65, pct: 98 },
  { age: 70, pct: 96 },
  { age: 75, pct: 95 },
  { age: 80, pct: 94 },
  { age: 85, pct: 93 },
  { age: 90, pct: 92 },
  { age: 95, pct: 88 },
];

export function DashboardMockup() {
  return (
    <div className="bg-muted/30 p-6 md:p-10">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* PRIMARY HERO CARD */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Your retirement plan
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 text-success text-xs font-medium px-2.5 py-1">
              <CheckCircle2 className="h-3 w-3" /> On track
            </span>
          </div>

          <div className="mt-6 flex flex-col md:flex-row md:items-end md:gap-12">
            <div>
              <div className="text-sm text-muted-foreground">You can retire at</div>
              <div className="hero-numeral text-8xl md:text-9xl leading-none text-foreground">
                64
              </div>
            </div>
            <div className="md:pb-3 space-y-3 md:border-l md:pl-12 border-border/70">
              <Metric label="Confidence (Monte Carlo)" value="92%" intent="success" />
              <Metric label="Monthly income (today’s $)" value={formatCurrency(7420)} />
              <Metric label="Money lasts to age" value="95" />
            </div>
          </div>

          {/* Confidence by age — sparkline-style bars */}
          <div className="mt-10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Confidence by survival age</span>
              <span>Monte Carlo · 10,000 trials</span>
            </div>
            <div className="mt-3 flex items-end gap-2 h-32">
              {TIMELINE_PROBABILITIES.map((p) => (
                <div key={p.age} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-md bg-primary/80"
                    style={{ height: `${p.pct}%` }}
                    aria-label={`Age ${p.age}: ${p.pct}%`}
                  />
                  <div className="text-[10px] text-muted-foreground numeral">{p.age}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR — recommendations */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Social Security
            </div>
            <div className="mt-3 text-3xl font-medium hero-numeral">Age 70</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Claiming at 70 adds <span className="text-success font-medium">$94,200</span> in
              lifetime expected income vs. claiming at FRA.
            </p>
            <button className="mt-4 inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline">
              Compare claim ages <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" /> Suggested action
            </div>
            <div className="mt-3 font-medium">Roth conversion ladder</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Convert <span className="numeral font-medium">$42,000/yr</span> from traditional
              to Roth during ages 64–72 to fill the 22% bracket. Estimated lifetime tax savings:{' '}
              <span className="text-success font-medium">{formatCurrency(78400)}</span>.
            </p>
          </div>

          <div className="rounded-2xl border border-warn/40 bg-warn/5 p-6">
            <div className="text-xs uppercase tracking-wider text-warn flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Watch
            </div>
            <div className="mt-3 font-medium">Healthcare gap, ages 64–65</div>
            <p className="mt-1 text-sm text-muted-foreground">
              You retire 12 months before Medicare. ACA premium estimate added at{' '}
              <span className="numeral font-medium">$1,180/mo</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Account breakdown strip */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Total household assets · {formatCurrency(1842000)}
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: '401(k)', value: 720000, color: 'bg-emerald-500' },
            { label: 'Traditional IRA', value: 410000, color: 'bg-emerald-400' },
            { label: 'Roth IRA', value: 215000, color: 'bg-emerald-300' },
            { label: 'Taxable', value: 380000, color: 'bg-slate-400' },
            { label: 'HSA', value: 117000, color: 'bg-slate-300' },
          ].map((a) => (
            <div key={a.label}>
              <div className={`h-1 ${a.color} rounded-full`} />
              <div className="mt-2 text-sm text-muted-foreground">{a.label}</div>
              <div className="text-lg font-medium numeral">{formatCurrency(a.value)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  intent,
}: {
  label: string;
  value: string;
  intent?: 'success' | 'warn' | 'danger';
}) {
  const tone =
    intent === 'success'
      ? 'text-success'
      : intent === 'warn'
        ? 'text-warn'
        : intent === 'danger'
          ? 'text-danger'
          : 'text-foreground';
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-medium numeral ${tone}`}>{value}</div>
    </div>
  );
}
