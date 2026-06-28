import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  WifiOff,
  Eye,
  FileText,
  Sparkles,
  ArrowRight,
  Github,
  TrendingUp,
  Calendar,
  PiggyBank,
} from 'lucide-react';

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg pointer-events-none" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                100% on-device · no account · open source
              </div>

              <h1 className="mt-6 text-balance text-5xl md:text-7xl tracking-tight font-medium leading-[0.95]">
                Plan your <span className="hero-numeral text-primary">retirement</span>
                <br />
                without giving away your data.
              </h1>

              <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
                A private retirement planner that runs entirely in your browser. Upload your
                statements — they never leave your device. Get a year-by-year plan, Social
                Security claim optimizer, and tax-aware withdrawal strategy.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/preview"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-3 text-sm font-medium shadow-sm hover:opacity-90 transition"
                >
                  See the design preview <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-muted transition"
                >
                  Read the privacy promise
                </Link>
              </div>
            </div>

            {/* hero number card */}
            <div className="w-full md:w-[360px] rounded-3xl border border-border bg-card/70 backdrop-blur shadow-sm p-6 animate-fade-up">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                A retirement projection looks like
              </div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="hero-numeral text-7xl">64</span>
                <span className="text-sm text-muted-foreground">target age</span>
              </div>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Confidence</dt>
                  <dd className="font-medium text-success numeral">92%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Monthly income</dt>
                  <dd className="font-medium numeral">$7,420</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">SS claim age</dt>
                  <dd className="font-medium numeral">70</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Money lasts to</dt>
                  <dd className="font-medium numeral">95</dd>
                </div>
              </dl>
              <div className="mt-5 pt-4 border-t border-border/60 text-xs text-muted-foreground">
                Illustrative only — your actual plan is computed locally from your numbers.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY PROMISE */}
      <section className="border-t border-border/60 bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-wider text-primary font-medium">
              The privacy promise
            </div>
            <h2 className="mt-3 text-4xl tracking-tight font-medium">
              Your financial life stays on your device.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Most retirement tools want you to hand over Social Security earnings, 401(k)
              balances, tax returns, and bank logins to a server. We do not. Every calculation
              runs in this browser tab.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {PROMISES.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border bg-card p-5 hover:shadow-sm transition"
              >
                <p.icon className="h-5 w-5 text-primary" />
                <div className="mt-3 font-medium">{p.title}</div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-wider text-primary font-medium">
            What it computes
          </div>
          <h2 className="mt-3 text-4xl tracking-tight font-medium">
            A real plan, not just a calculator.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition"
            >
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-medium tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl tracking-tight font-medium">
              Read the source. Build it yourself.
            </h3>
            <p className="mt-2 text-muted-foreground max-w-lg">
              The entire planner is open source under the MIT license. Verify our privacy
              promise by inspecting the network tab — you&apos;ll see zero outbound calls.
            </p>
          </div>
          <a
            href="https://github.com/venkatesanps/retirement-planning"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-muted transition"
          >
            <Github className="h-4 w-4" /> View on GitHub
          </a>
        </div>
      </section>
    </>
  );
}

const PROMISES = [
  {
    icon: WifiOff,
    title: 'No upload',
    body: 'PDFs are parsed in a Web Worker on your device. Files never touch a server.',
  },
  {
    icon: Lock,
    title: 'Encrypted at rest',
    body: 'Optional passphrase encrypts everything in browser storage with AES-GCM 256.',
  },
  {
    icon: Eye,
    title: 'No tracking',
    body: 'No analytics, no fonts from a CDN, no third-party scripts. Strict CSP enforced.',
  },
  {
    icon: ShieldCheck,
    title: 'No account',
    body: 'No signup, no email, no cloud. Bookmark the page and your data is there next time.',
  },
];

const FEATURES = [
  {
    icon: Calendar,
    title: 'Year-by-year projection',
    body: 'Cash flow, balances, taxes, and required withdrawals every year from now until age 95+. With charts and a full table.',
  },
  {
    icon: TrendingUp,
    title: 'Social Security optimizer',
    body: 'Compares claiming at 62, full retirement age, and 70 — including spousal and survivor benefits — and recommends the best for your situation.',
  },
  {
    icon: PiggyBank,
    title: 'Tax-aware withdrawals',
    body: 'Sequences taxable → traditional → Roth, accounts for RMDs at 73/75, and suggests Roth conversions in low-tax gap years.',
  },
  {
    icon: FileText,
    title: 'Document upload',
    body: 'Drop your 1040, SSA statement, or 401(k) statement. We extract the numbers locally and ask you to confirm before saving.',
  },
  {
    icon: Sparkles,
    title: 'Monte Carlo confidence',
    body: '10,000 trial simulation over historical or parametric returns. Tells you P(success) for your plan, not just a single deterministic line.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for couples',
    body: 'Joint filing, spousal Social Security, survivor benefits, and household RMDs are first-class from day one.',
  },
];
