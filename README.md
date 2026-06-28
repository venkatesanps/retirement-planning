# Retirement Planning

> A privacy-first retirement planning portal. 100% client-side. Your documents and numbers never leave your device.

**Status:** Phase 0 — Foundations · landing page, privacy page, design preview, CI/CD. Engine and document parsing come in Phase 1+.

**Live preview:** _will be published to `https://venkatesanps.github.io/retirement-planning/` once the repo is pushed and GitHub Pages is enabled._

---

## What it is

A modern web app where a user can plan their U.S. retirement: when they can retire, how much they can draw per year, how to sequence withdrawals across taxable / 401(k) / IRA / Roth / HSA / Social Security / pension, and how confident they should be about the plan lasting.

The differentiator is **privacy**: every calculation runs in your browser. Documents (1040, SSA statement, brokerage statements) are parsed locally with [pdf.js](https://mozilla.github.io/pdf.js/). Parsed numbers live in IndexedDB and can be encrypted with a passphrase via the Web Crypto API. There is no backend, no account, no analytics.

See [`PLAN.md`](./PLAN.md) for the full product and engineering plan.

---

## Quickstart

```bash
# requires Node 20+
corepack enable
corepack prepare pnpm@9.15.0 --activate

pnpm install
pnpm dev          # http://localhost:3000
pnpm build        # static export to apps/web/out
pnpm typecheck
pnpm lint
```

## Repository layout

```
retirement-planning/
├── apps/web/               # Next.js 15 app (App Router, static export)
├── packages/               # Phase 1+: engine, parsers, reference-data
├── .github/workflows/      # CI + GitHub Pages deploy
├── PLAN.md                 # Product + engineering plan
├── SECURITY.md             # Threat model + reporting
└── CONTRIBUTING.md
```

## Deployment

A push to `main` triggers `.github/workflows/deploy.yml`, which builds the static export with `BASE_PATH=/<repo-name>` and publishes to GitHub Pages.

To enable Pages on a freshly pushed repo:
1. Repo Settings → Pages → Source: **GitHub Actions**
2. Re-run the latest `Deploy to GitHub Pages` workflow

## Privacy and security

See [`SECURITY.md`](./SECURITY.md) and the in-app [/privacy](./apps/web/app/privacy/page.tsx) page.

Disclosures: `security@` _(set up before launch)_.

## License

MIT — see [`LICENSE`](./LICENSE).

This is an educational tool, not financial advice.
