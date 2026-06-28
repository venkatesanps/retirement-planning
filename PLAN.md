# Retirement Planning Portal — Plan & Design

> Status: **Draft for review** · Owner: Venkat · Target: open-source, GitHub Pages-hosted, US-focused retirement planner that respects user privacy by keeping all data on-device.

---

## 1. Product vision

A modern, trustworthy retirement planning portal where a user can:

1. Enter (or upload statements to populate) their **age, household, income, assets, debts, and benefits**.
2. Get a **personalized retirement plan**: earliest viable retirement age, target retirement age, year-by-year cash-flow projection, withdrawal sequencing across taxable / 401(k) / IRA / Roth / HSA / pension / Social Security, RMD schedule, Roth-conversion suggestions, and Medicare/healthcare gap planning.
3. Explore **what-if scenarios** (retire at 60 vs. 65 vs. 67, claim SS at 62 vs. FRA vs. 70, market down-years, longevity to 95 vs. 100).
4. **Never trust a server with the data.** Everything is computed in-browser; documents and parsed numbers live only in the user's device storage, optionally encrypted with a passphrase.

Non-goals (v1): tax filing, investment management, account aggregation via Plaid, multi-currency, non-US tax regimes.

---

## 2. Why "100% local, static site on GitHub Pages"

The privacy promise is the central feature. The architecture must make that promise *technically true*, not just policy.

| Concern | Decision |
|---|---|
| Where do documents live? | Browser only (`IndexedDB`). Never uploaded. PDF parsing runs in a Web Worker via `pdf.js`. |
| Where do parsed numbers live? | Same `IndexedDB`, optionally AES-GCM encrypted with a passphrase using the Web Crypto API. |
| What does the server see? | Nothing. The "server" is GitHub Pages serving static HTML/JS/CSS. A strict Content-Security-Policy forbids outbound network calls except to the same origin. |
| Telemetry? | None. No Google Analytics, no Sentry, no fonts from a CDN. Self-host everything. |
| How does the user verify the promise? | Open-source repo, reproducible build, `Network` tab shows zero third-party requests, optional "panic clear" button wipes IndexedDB. |

This is why a **Single-Page App, fully static, no backend** is the right architecture even though "enterprise-grade" usually implies a backend. The enterprise-grade qualities here are: strong typing, audited dependencies, accessibility (WCAG 2.2 AA), security headers, CI gating, semantic versioning, and a published changelog — not server infrastructure.

---

## 3. Tech stack (recommended)

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15 with `output: "export"`** (static export) | Modern routing + RSC ergonomics + battle-tested export to static for GitHub Pages. Alternative: Vite + React Router if you'd rather skip Next. |
| Language | **TypeScript (strict)** | Required for finance code — silent number coercions would be catastrophic. |
| UI | **Tailwind CSS v4 + shadcn/ui + Radix primitives** | Trendy, accessible, themeable. Dark mode out of the box. |
| Icons | **lucide-react** | Consistent line-icon set used by shadcn. |
| Charts | **Recharts** for standard charts, **visx** if we need custom (Sankey for withdrawal flows). | |
| Forms | **react-hook-form + zod** | Strong validation, great UX for multi-step wizard. |
| State | **Zustand** (lightweight) with a **Dexie** (IndexedDB) persistence adapter. | Keeps things simple. No Redux. |
| Document parsing | **pdf.js** in a Web Worker | Mature, runs offline. |
| Crypto | **Web Crypto API** (AES-GCM 256, PBKDF2 with 600k iterations) | Native, audited, no extra dependency. |
| Monte Carlo / sims | **TS in a Web Worker**; consider **Pyodide** later if we want NumPy ergonomics | Don't block the UI thread. |
| PDF report export | **react-pdf** (`@react-pdf/renderer`) | Generates the user's retirement report client-side. |
| Testing | **Vitest** (unit), **Playwright** (e2e) | |
| CI/CD | **GitHub Actions → GitHub Pages** | Free, fits the open-source story. |
| Linting | **ESLint + Prettier + typescript-eslint strict** | |

---

## 4. Information architecture

```
/                       Landing — value prop, privacy promise, "Start" CTA
/onboarding             3-step wizard: profile → finances → goals
/dashboard              Plan summary: retirement age, monthly income, longevity confidence
/plan                   Year-by-year table + drawdown chart
/scenarios              Side-by-side what-if comparison
/documents              Upload, parse, review extracted values, delete
/settings               Encryption passphrase, theme, units, "wipe all data"
/learn                  Glossary: FRA, RMD, IRMAA, Roth ladder (helps trust)
/about/privacy          The technical privacy story with screenshots
```

---

## 5. Data model (lives in IndexedDB)

```ts
type Person = {
  id: 'self' | 'spouse';
  birthDate: string;              // ISO
  state: USState;                 // for state tax
  filingStatus: 'single' | 'mfj' | 'mfs' | 'hoh';
  currentAnnualIncome: number;
  expectedRetirementAge: number;  // user's target; we'll also compute earliest
};

type Account = {
  id: string;
  owner: 'self' | 'spouse' | 'joint';
  kind: '401k' | '403b' | 'tradIRA' | 'rothIRA' | 'roth401k' | 'HSA'
      | 'taxableBrokerage' | 'savings' | 'pension' | 'annuity' | 'realEstate';
  balance: number;
  costBasis?: number;             // taxable only
  annualContribution?: number;
  employerMatch?: number;
  expectedReturn?: number;        // override of default
  pensionMonthly?: number;        // pension only
  pensionStartAge?: number;
};

type SocialSecurity = {
  owner: 'self' | 'spouse';
  estimatedPIA: number;           // from SSA statement
  claimAge: number;               // 62..70, default FRA
};

type Expenses = {
  currentMonthly: number;
  retirementMonthly: number;      // user override; default 80% of current
  healthcarePreMedicare: number;  // age 50–64 if retiring early
  oneTime: Array<{ year: number; amount: number; label: string }>;
};

type Assumptions = {
  inflation: number;              // default 2.5%
  equityReturn: number;           // default 7%
  bondReturn: number;             // default 4%
  glidepath: 'aggressive' | 'moderate' | 'conservative';
  longevityAge: number;           // default 95
};
```

All of the above persists encrypted in IndexedDB. The encryption key is derived from a user passphrase via PBKDF2; it never leaves the browser.

---

## 6. The retirement engine (core algorithm)

The engine answers four questions:

1. **When can I retire?** — earliest age at which P(success) ≥ 90% with chosen longevity and spend.
2. **How much can I draw each year, from which bucket?** — tax-aware withdrawal sequencing.
3. **What do my Social Security claim choices cost or save?** — claim-age optimizer.
4. **How robust is the plan?** — Monte Carlo over historical or parametric returns.

### 6.1 Deterministic projection (year-by-year)

For each year from current age to longevity age:
- Apply contributions while working.
- Apply growth (per-account expected return).
- Apply Social Security (started at chosen claim age, COLA-adjusted).
- Apply pension (if any), annuity, part-time income.
- Compute required spend (inflation-adjusted).
- **Withdrawal order (configurable)**, default:
  1. Required Minimum Distributions first (age 73 / 75 depending on birth year).
  2. Taxable brokerage (long-term cap gains, basis tracked).
  3. Traditional 401(k) / IRA (ordinary income).
  4. Roth (last, to preserve tax-free growth and bequest).
- Track federal + state taxable income → estimated tax → after-tax cash.
- Stop / flag if portfolio reaches zero before longevity age.

### 6.2 Social Security claim optimizer

Iterate claim age 62…70 for each spouse, compute lifetime PV at user's discount rate, recommend the claim age that maximizes household lifetime expected income with surviving-spouse protection.

### 6.3 Roth conversion ladder

Identify "gap years" between retirement and RMD age where marginal tax rate is low. Suggest annual conversion amounts that fill the user's chosen bracket (e.g., top of 12% or 22%) without crossing the next IRMAA tier at age 63+.

### 6.4 Monte Carlo

10,000 trials, per-year returns drawn from either (a) parametric normal with user-supplied mean/stdev, or (b) historical bootstrap from 1928+ S&P / bond data bundled with the app. Output: success probability, P10/P50/P90 ending balance.

### 6.5 Reference data bundled with the app

- Federal tax brackets (2026, with note: update annually)
- Standard deduction
- IRA / 401(k) / HSA contribution limits + catch-up
- Social Security wage base & bend points
- RMD divisors (Uniform Lifetime Table)
- IRMAA tiers
- State income tax (top marginal + retirement-income treatment) — Phase 2

Everything is data, not code, so updating for the new tax year is a single JSON edit.

---

## 7. Document upload & parsing

### What we ask for and why

| Document | What we extract | Why we need it |
|---|---|---|
| Most recent **Form 1040** (PDF) | AGI, wages, qualified dividends, cap gains, filing status | Calibrates current tax picture |
| **Social Security statement** (`ssa.gov/myaccount` PDF) | PIA estimates at 62 / FRA / 70 | Replaces manual entry |
| **401(k) / 403(b) statement** | Balance, YTD contribution, employer match | Replaces manual entry |
| **IRA / brokerage statement** | Balance, cost basis | Replaces manual entry |
| **Pension benefit statement** | Monthly benefit, start age, survivor option | Replaces manual entry |

### How it works (and how we earn trust)

1. User drops a PDF on the page.
2. A **Web Worker** loads `pdf.js`, extracts text, runs a per-document parser (regex + named-entity rules).
3. The UI shows **"Here's what I found — please confirm before saving."** Nothing is auto-saved.
4. On confirm: parsed numbers go into IndexedDB. The original PDF is **never stored** by default (option to store encrypted if user wants).
5. The Documents page lists what's been parsed, lets the user re-upload, edit, or delete.

Visible reassurances on the upload screen:
- "Your file is being read by JavaScript on this page. It is **not uploaded** anywhere."
- A live "Network requests this session" counter (should stay at 0 third-party).
- Link to the open-source parser code.

---

## 8. UX & design system

**Aesthetic**: calm, confident, "private bank meets Linear." Lots of whitespace, generous typography, restrained color, charts that look like Bloomberg/Stripe rather than a 90s 401(k) portal.

**Design tokens**:
- Typography: **Inter** for UI, **Fraunces** for hero numerals (your retirement age deserves a real serif).
- Color: neutral slate base, a single accent (`emerald-600` for "on track", `amber-500` for "watch", `rose-500` for "shortfall"). Full dark mode.
- Spacing: 4px grid. Cards: `rounded-2xl`, subtle shadow, `border border-slate-200/60`.
- Motion: Framer Motion for page transitions and chart reveals. Subtle, < 300ms.

**Hero numerals** on the dashboard (big, calm, no chartjunk):
```
You can retire at        With 92% confidence
   ── 64 ──             your money lasts to age 95
Monthly income in retirement: $7,420 (today's $)
```

**Information density** rises as the user goes deeper: dashboard is sparse, /plan is a dense year-by-year table with the chart above it.

**Accessibility**: WCAG 2.2 AA. All charts have data-table fallbacks. Keyboard nav. `prefers-reduced-motion` respected.

A mood-board mockup will be produced in Phase 0 before any production code.

---

## 9. Security & privacy (the "enterprise-grade" details)

- **CSP**: `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none';`
- **No third-party requests at runtime.** Fonts self-hosted. Charts library bundled.
- **Subresource Integrity** on any external script (there shouldn't be any).
- **AES-GCM 256** for at-rest encryption of the Dexie store when the user sets a passphrase. Passphrase strength meter (`zxcvbn`).
- **Auto-lock** after configurable idle timeout.
- **Panic wipe** button in settings — clears IndexedDB + Cache Storage + Service Worker registration.
- **Reproducible builds** via pinned `pnpm-lock.yaml`; CI publishes the build hash.
- **Dependency audit**: `pnpm audit` + Dependabot + manual review of every new dep before adding.
- **Disclaimer banner** on first run: educational tool, not financial advice, no fiduciary relationship, US tax assumptions, last updated YYYY-MM-DD.

---

## 10. Quality bar / "enterprise-grade" checklist

- [ ] TypeScript strict, no `any` in core engine
- [ ] 100% unit-test coverage on the retirement engine (it's pure functions — easy)
- [ ] Golden-file tests: a few canonical personas with hand-verified expected outputs
- [ ] Playwright e2e: full onboarding → plan → export PDF
- [ ] Lighthouse: ≥ 95 across the board, no third-party requests
- [ ] axe-core a11y CI check
- [ ] Bundle size budget: < 250 KB initial JS gzipped
- [ ] OpenSSF Scorecard ≥ 7
- [ ] CHANGELOG.md, semantic versioning, signed releases
- [ ] CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md (with disclosure email)

---

## 11. Phased roadmap

| Phase | Scope | Outcome |
|---|---|---|
| **0 — Foundations** (week 1) | Repo, Next.js scaffold, design tokens, CI, GitHub Pages deploy, landing page, privacy page | Empty shell live at `https://<user>.github.io/retirement-planning` |
| **1 — Manual MVP** (week 2–3) | Onboarding wizard, IndexedDB persistence, deterministic projection engine, dashboard, year-by-year plan table + chart | A user can type their numbers and see a basic plan |
| **2 — Scenarios + SS optimizer** (week 4) | What-if comparison, Social Security claim optimizer, retirement-age slider | Real planning value |
| **3 — Document upload** (week 5–6) | PDF.js worker, parsers for 1040 / SSA / brokerage statements, review-before-save flow | The "trust" feature lands |
| **4 — Tax engine + Roth ladder** (week 7) | Federal + state tax, RMDs, Roth conversion recommender, IRMAA awareness | Sophisticated tax planning |
| **5 — Monte Carlo + report** (week 8) | 10k-trial sim, success probability, PDF report export | Robustness story |
| **6 — Polish & launch** (week 9) | A11y audit, perf budget, security review, docs, v1.0.0 release | Public launch |

Each phase ends with a deployed, demoable build.

---

## 12. Repository layout (proposed)

```
retirement-planning/
├── apps/
│   └── web/                    # Next.js app
│       ├── app/
│       ├── components/
│       └── lib/
├── packages/
│   ├── engine/                 # Pure TS retirement engine (testable in isolation)
│   ├── parsers/                # PDF parsers per document type
│   └── reference-data/         # JSON: tax brackets, RMD tables, etc.
├── .github/workflows/
│   ├── ci.yml                  # lint + typecheck + test + a11y + lighthouse
│   └── deploy.yml              # build + publish to gh-pages
├── PLAN.md                     # this file
├── SECURITY.md
└── README.md
```

---

## 13. Open questions for you to decide

1. **Household scope**: single user only, or support a spouse/partner with joint planning? *(Recommendation: support spouse from Phase 1 — affects schema, hard to retrofit.)*
2. **Country / tax regime**: US-only, or pluggable for India / others later? *(Recommendation: US-only v1; design data layer to be region-pluggable.)*
3. **Framework**: Next.js (recommended) or Vite + React?
4. **Hosting**: GitHub Pages (recommended, matches "host in my github") or Cloudflare Pages?
5. **Domain**: `<username>.github.io/retirement-planning` or custom domain?
6. **License**: MIT, Apache-2.0, or AGPL-3.0 (strongest copyleft)? *(Recommendation: MIT — widest adoption for a privacy-focused tool you want people to trust by inspection.)*
7. **Disclaimer language**: do you want me to draft the "not financial advice" copy, or will you have a real disclaimer reviewed?

---

## 14. What I'll produce after your review

Once you sign off on this plan (with whatever edits), the next deliverable is:

1. **Phase 0 PR**: repo scaffold, CI, deploy, landing + privacy page, design tokens, sample dashboard mockup.
2. **Design preview**: a static `/preview` route showing the dashboard, plan table, and document-upload mockups so you can react to the look before behavior is built.

Then we iterate phase by phase with a deployed build at the end of each.
