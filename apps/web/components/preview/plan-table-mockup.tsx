import { formatCurrency } from '@/lib/utils';

type Row = {
  age: number;
  year: number;
  income: { ss: number; pension: number; work: number };
  withdrawal: { taxable: number; trad: number; roth: number };
  taxes: number;
  spend: number;
  endBalance: number;
  flag?: 'retire' | 'medicare' | 'ss' | 'rmd';
};

const ROWS: Row[] = [
  {
    age: 58,
    year: 2026,
    income: { ss: 0, pension: 0, work: 220000 },
    withdrawal: { taxable: 0, trad: 0, roth: 0 },
    taxes: 52000,
    spend: 110000,
    endBalance: 1842000,
  },
  {
    age: 62,
    year: 2030,
    income: { ss: 0, pension: 0, work: 240000 },
    withdrawal: { taxable: 0, trad: 0, roth: 0 },
    taxes: 58000,
    spend: 118000,
    endBalance: 2380000,
  },
  {
    age: 64,
    year: 2032,
    income: { ss: 0, pension: 0, work: 0 },
    withdrawal: { taxable: 80000, trad: 0, roth: 0 },
    taxes: 12000,
    spend: 125000,
    endBalance: 2495000,
    flag: 'retire',
  },
  {
    age: 65,
    year: 2033,
    income: { ss: 0, pension: 0, work: 0 },
    withdrawal: { taxable: 60000, trad: 30000, roth: 0 },
    taxes: 14000,
    spend: 128000,
    endBalance: 2520000,
    flag: 'medicare',
  },
  {
    age: 70,
    year: 2038,
    income: { ss: 58800, pension: 0, work: 0 },
    withdrawal: { taxable: 0, trad: 40000, roth: 0 },
    taxes: 16000,
    spend: 135000,
    endBalance: 2610000,
    flag: 'ss',
  },
  {
    age: 75,
    year: 2043,
    income: { ss: 66500, pension: 0, work: 0 },
    withdrawal: { taxable: 0, trad: 78000, roth: 0 },
    taxes: 21000,
    spend: 142000,
    endBalance: 2480000,
    flag: 'rmd',
  },
  {
    age: 85,
    year: 2053,
    income: { ss: 84000, pension: 0, work: 0 },
    withdrawal: { taxable: 0, trad: 92000, roth: 18000 },
    taxes: 23000,
    spend: 158000,
    endBalance: 1870000,
  },
  {
    age: 95,
    year: 2063,
    income: { ss: 108000, pension: 0, work: 0 },
    withdrawal: { taxable: 0, trad: 60000, roth: 32000 },
    taxes: 21000,
    spend: 178000,
    endBalance: 920000,
  },
];

export function PlanTableMockup() {
  return (
    <div className="bg-muted/30">
      {/* Chart */}
      <div className="p-6 md:p-10 border-b border-border/60">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Portfolio balance · ages 58 → 95</span>
          <span className="flex items-center gap-3">
            <Legend color="bg-emerald-600" label="Tax-deferred" />
            <Legend color="bg-emerald-400" label="Roth" />
            <Legend color="bg-slate-400" label="Taxable" />
          </span>
        </div>
        <StackedBalanceChart />
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
              <th className="px-4 py-3 font-medium text-right">Taxable</th>
              <th className="px-4 py-3 font-medium text-right">Trad/401k</th>
              <th className="px-4 py-3 font-medium text-right">Roth</th>
              <th className="px-4 py-3 font-medium text-right">Taxes</th>
              <th className="px-4 py-3 font-medium text-right">Spend</th>
              <th className="px-4 py-3 font-medium text-right">End balance</th>
              <th className="px-4 py-3 font-medium">Event</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {ROWS.map((r) => (
              <tr
                key={r.age}
                className={`hover:bg-card/60 ${r.flag === 'retire' ? 'bg-primary/[0.04]' : ''}`}
              >
                <td className="px-4 py-3 font-medium numeral">{r.age}</td>
                <td className="px-4 py-3 text-muted-foreground numeral">{r.year}</td>
                <td className="px-4 py-3 text-right numeral">
                  {r.income.work > 0 ? formatCurrency(r.income.work, { compact: true }) : '—'}
                </td>
                <td className="px-4 py-3 text-right numeral">
                  {r.income.ss > 0 ? formatCurrency(r.income.ss, { compact: true }) : '—'}
                </td>
                <td className="px-4 py-3 text-right numeral">
                  {r.withdrawal.taxable > 0
                    ? formatCurrency(r.withdrawal.taxable, { compact: true })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right numeral">
                  {r.withdrawal.trad > 0
                    ? formatCurrency(r.withdrawal.trad, { compact: true })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right numeral">
                  {r.withdrawal.roth > 0
                    ? formatCurrency(r.withdrawal.roth, { compact: true })
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right numeral text-muted-foreground">
                  {formatCurrency(r.taxes, { compact: true })}
                </td>
                <td className="px-4 py-3 text-right numeral">
                  {formatCurrency(r.spend, { compact: true })}
                </td>
                <td className="px-4 py-3 text-right font-medium numeral">
                  {formatCurrency(r.endBalance, { compact: true })}
                </td>
                <td className="px-4 py-3">
                  {r.flag ? <EventChip flag={r.flag} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 text-xs text-muted-foreground border-t border-border/60">
        Showing 8 of 38 rows · the full year-by-year table renders all years from current age to
        longevity.
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-sm ${color}`} /> {label}
    </span>
  );
}

function EventChip({ flag }: { flag: NonNullable<Row['flag']> }) {
  const map = {
    retire: { label: 'Retire', cls: 'bg-primary/10 text-primary' },
    medicare: { label: 'Medicare starts', cls: 'bg-emerald-100 text-emerald-800' },
    ss: { label: 'SS claim', cls: 'bg-blue-100 text-blue-800' },
    rmd: { label: 'RMDs begin', cls: 'bg-warn/10 text-warn' },
  } as const;
  const { label, cls } = map[flag];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

function StackedBalanceChart() {
  const data = [
    { age: 58, taxable: 380, trad: 1130, roth: 215, hsa: 117 },
    { age: 62, taxable: 470, trad: 1480, roth: 280, hsa: 150 },
    { age: 64, taxable: 460, trad: 1620, roth: 285, hsa: 130 },
    { age: 68, taxable: 350, trad: 1740, roth: 320, hsa: 110 },
    { age: 72, taxable: 240, trad: 1820, roth: 380, hsa: 90 },
    { age: 76, taxable: 120, trad: 1750, roth: 440, hsa: 80 },
    { age: 80, taxable: 40, trad: 1620, roth: 510, hsa: 70 },
    { age: 85, taxable: 0, trad: 1300, roth: 520, hsa: 50 },
    { age: 90, taxable: 0, trad: 980, roth: 480, hsa: 30 },
    { age: 95, taxable: 0, trad: 480, roth: 420, hsa: 20 },
  ];

  const max = Math.max(...data.map((d) => d.taxable + d.trad + d.roth + d.hsa));

  return (
    <div className="mt-4 flex items-end gap-1 h-56">
      {data.map((d) => {
        const total = d.taxable + d.trad + d.roth + d.hsa;
        const h = (k: number) => `${(k / max) * 100}%`;
        return (
          <div key={d.age} className="flex-1 flex flex-col-reverse items-stretch gap-0.5">
            <div className="bg-slate-400 rounded-b-sm" style={{ height: h(d.taxable) }} />
            <div className="bg-emerald-600" style={{ height: h(d.trad) }} />
            <div className="bg-emerald-400" style={{ height: h(d.roth) }} />
            <div className="bg-slate-300 rounded-t-sm" style={{ height: h(d.hsa) }} />
            <div className="mt-1 text-[10px] text-center text-muted-foreground numeral">
              {d.age}
            </div>
            <div className="sr-only">
              Age {d.age}: total {formatCurrency(total * 1000)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
