'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { useHydrateStore, useStore } from '@/lib/store';
import {
  defaultFormValues,
  formSchema,
  sampleFormValues,
  toHousehold,
  type FormInput,
  type FormValues,
} from '@/lib/form-schema';
import { Button, FieldError, Input, Label, Select } from '@/components/ui/field';

const ACCOUNT_KIND_LABELS: Record<string, string> = {
  '401k': '401(k)',
  '403b': '403(b)',
  roth401k: 'Roth 401(k)',
  tradIRA: 'Traditional IRA',
  rothIRA: 'Roth IRA',
  HSA: 'HSA',
  taxableBrokerage: 'Taxable brokerage',
  savings: 'Savings',
  pension: 'Pension (income only)',
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

export default function OnboardingPage() {
  useHydrateStore();
  const router = useRouter();
  const isHydrated = useStore((s) => s.isHydrated);
  const existing = useStore((s) => s.household);
  const setHousehold = useStore((s) => s.setHousehold);

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultFormValues as FormInput,
    mode: 'onBlur',
  });

  const { register, control, handleSubmit, reset, formState } = form;
  const errors = formState.errors;

  const accounts = useFieldArray({ control, name: 'accounts' });
  const hasSpouse = useWatch({ control, name: 'hasSpouse' });

  // After hydration, prefill from saved household if present
  useEffect(() => {
    if (!isHydrated || !existing) return;
    const v: FormValues = {
      hasSpouse: !!existing.spouse,
      filingStatus: existing.filingStatus,
      state: existing.state,
      selfBirthYear: existing.self.birthYear,
      selfIncome: existing.self.currentAnnualIncome,
      selfRetireAge: existing.self.targetRetirementAge,
      selfPiaMonthly: existing.socialSecurity.find((s) => s.owner === 'self')?.piaMonthly ?? 0,
      selfClaimAge: existing.socialSecurity.find((s) => s.owner === 'self')?.claimAge ?? 67,
      spouseBirthYear: existing.spouse?.birthYear,
      spouseIncome: existing.spouse?.currentAnnualIncome,
      spouseRetireAge: existing.spouse?.targetRetirementAge,
      spousePiaMonthly: existing.socialSecurity.find((s) => s.owner === 'spouse')?.piaMonthly,
      spouseClaimAge: existing.socialSecurity.find((s) => s.owner === 'spouse')?.claimAge,
      accounts: existing.accounts.map((a) => ({
        id: a.id,
        owner: a.owner,
        kind: a.kind,
        balance: a.balance,
        annualContribution: a.annualContribution,
        employerMatch: a.employerMatch,
      })),
      annualSpend: existing.spend.annualSpend,
      longevityAge: existing.assumptions.longevityAge,
      equityPct: Math.round(existing.assumptions.startingEquityWeight * 100),
    };
    reset(v as FormInput);
  }, [isHydrated, existing, reset]);

  const onSubmit = (v: FormValues) => {
    setHousehold(toHousehold(v));
    router.push('/dashboard/');
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <div className="text-xs uppercase tracking-wider text-primary font-medium">
          Onboarding
        </div>
        <h1 className="mt-3 text-4xl tracking-tight font-medium">
          Tell us about your household.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Everything you enter is saved in <span className="font-medium">this browser only</span>.
          Nothing is uploaded. You can clear it from Settings at any time.
        </p>
        <div className="mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reset(sampleFormValues as FormInput)}
          >
            <Sparkles className="h-3.5 w-3.5" /> Load sample household
          </Button>
        </div>
      </header>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
        {/* HOUSEHOLD */}
        <Section title="Household" eyebrow="01">
          <Row>
            <div>
              <Label htmlFor="state">State</Label>
              <Select id="state" {...register('state')}>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="filingStatus">Filing status</Label>
              <Select id="filingStatus" {...register('filingStatus')}>
                <option value="single">Single</option>
                <option value="mfj">Married filing jointly</option>
                <option value="mfs">Married filing separately</option>
                <option value="hoh">Head of household</option>
              </Select>
            </div>
            <label className="flex items-end gap-2 pb-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                {...register('hasSpouse')}
              />
              <span className="text-sm">Include spouse / partner</span>
            </label>
          </Row>
        </Section>

        {/* SELF */}
        <Section title="You" eyebrow="02">
          <Row>
            <div>
              <Label htmlFor="selfBirthYear">Birth year</Label>
              <Input id="selfBirthYear" type="number" min={1920} max={2010} {...register('selfBirthYear')} />
              <FieldError message={errors.selfBirthYear?.message} />
            </div>
            <div>
              <Label htmlFor="selfIncome" hint="annual, gross">Current income</Label>
              <Input id="selfIncome" type="number" step="any" {...register('selfIncome')} />
            </div>
            <div>
              <Label htmlFor="selfRetireAge">Target retire age</Label>
              <Input id="selfRetireAge" type="number" min={50} max={80} {...register('selfRetireAge')} />
            </div>
          </Row>
          <Row>
            <div>
              <Label htmlFor="selfPiaMonthly" hint="from SSA statement">SS at full retirement age (monthly)</Label>
              <Input id="selfPiaMonthly" type="number" step="any" {...register('selfPiaMonthly')} />
            </div>
            <div>
              <Label htmlFor="selfClaimAge">SS claim age</Label>
              <Input id="selfClaimAge" type="number" min={62} max={70} {...register('selfClaimAge')} />
            </div>
            <div />
          </Row>
        </Section>

        {/* SPOUSE */}
        {hasSpouse && (
          <Section title="Spouse / partner" eyebrow="03">
            <Row>
              <div>
                <Label htmlFor="spouseBirthYear">Birth year</Label>
                <Input id="spouseBirthYear" type="number" min={1920} max={2010} {...register('spouseBirthYear')} />
              </div>
              <div>
                <Label htmlFor="spouseIncome">Current income</Label>
                <Input id="spouseIncome" type="number" step="any" {...register('spouseIncome')} />
              </div>
              <div>
                <Label htmlFor="spouseRetireAge">Target retire age</Label>
                <Input id="spouseRetireAge" type="number" min={50} max={80} {...register('spouseRetireAge')} />
              </div>
            </Row>
            <Row>
              <div>
                <Label htmlFor="spousePiaMonthly">SS at full retirement age (monthly)</Label>
                <Input id="spousePiaMonthly" type="number" step="any" {...register('spousePiaMonthly')} />
              </div>
              <div>
                <Label htmlFor="spouseClaimAge">SS claim age</Label>
                <Input id="spouseClaimAge" type="number" min={62} max={70} {...register('spouseClaimAge')} />
              </div>
              <div />
            </Row>
          </Section>
        )}

        {/* ACCOUNTS */}
        <Section title="Accounts" eyebrow={hasSpouse ? '04' : '03'}>
          <p className="-mt-2 mb-4 text-sm text-muted-foreground">
            Add each retirement and investment account. Balance is current value;
            contributions are annual (while still working).
          </p>
          <div className="space-y-3">
            {accounts.fields.map((field, i) => (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-2 items-end rounded-xl border border-border bg-card p-3"
              >
                <div className="col-span-3">
                  <Label>Kind</Label>
                  <Select {...register(`accounts.${i}.kind` as const)}>
                    {Object.entries(ACCOUNT_KIND_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Owner</Label>
                  <Select {...register(`accounts.${i}.owner` as const)}>
                    <option value="self">Self</option>
                    {hasSpouse && <option value="spouse">Spouse</option>}
                    <option value="joint">Joint</option>
                  </Select>
                </div>
                <div className="col-span-3">
                  <Label>Balance</Label>
                  <Input type="number" step="any" {...register(`accounts.${i}.balance` as const)} />
                </div>
                <div className="col-span-2">
                  <Label>Contrib/yr</Label>
                  <Input type="number" step="any" {...register(`accounts.${i}.annualContribution` as const)} />
                </div>
                <div className="col-span-1">
                  <Label>Match</Label>
                  <Input type="number" step="any" {...register(`accounts.${i}.employerMatch` as const)} />
                </div>
                <div className="col-span-1 pb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => accounts.remove(i)}
                    className="text-muted-foreground hover:text-danger p-2"
                    aria-label="Remove account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                accounts.append({
                  id: crypto.randomUUID(),
                  owner: 'self',
                  kind: '401k',
                  balance: 0,
                })
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add account
            </Button>
            {errors.accounts?.message ? <FieldError message={errors.accounts.message} /> : null}
          </div>
        </Section>

        {/* GOALS */}
        <Section title="Goals & assumptions" eyebrow={hasSpouse ? '05' : '04'}>
          <Row>
            <div>
              <Label htmlFor="annualSpend" hint="today's $">Retirement spend / yr</Label>
              <Input id="annualSpend" type="number" step="any" {...register('annualSpend')} />
            </div>
            <div>
              <Label htmlFor="longevityAge">Plan to age</Label>
              <Input id="longevityAge" type="number" min={70} max={110} {...register('longevityAge')} />
            </div>
            <div>
              <Label htmlFor="equityPct" hint="0–100">Equity %</Label>
              <Input id="equityPct" type="number" min={0} max={100} {...register('equityPct')} />
            </div>
          </Row>
        </Section>

        <div className="flex items-center justify-between border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            Saved automatically to this browser when you continue.
          </p>
          <Button type="submit" size="lg" disabled={formState.isSubmitting}>
            See my plan <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="text-xs uppercase tracking-wider text-primary font-medium mb-1">
        {eyebrow}
      </div>
      <h2 className="text-2xl tracking-tight font-medium mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">{children}</div>;
}
