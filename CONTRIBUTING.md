# Contributing

Thank you for your interest in contributing.

## Ground rules

1. **Privacy is non-negotiable.** Any change that adds an outbound network call, third-party script, analytics, or persistent off-device storage will be rejected. If you need to make such a change, file an issue first to discuss.
2. **TypeScript strict.** No `any` in the engine or parsers. `noUncheckedIndexedAccess` is on for a reason.
3. **No financial advice.** UI copy, error messages, and docs should never imply a fiduciary relationship. We educate; users decide.

## Local setup

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install
pnpm dev
```

## Before opening a PR

```bash
pnpm lint
pnpm typecheck
pnpm build      # ensures static export still works
```

CI runs the same checks.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(engine): add Roth conversion ladder optimizer
fix(parsers): handle multi-page SSA statements
docs: clarify privacy promise wording
chore: bump next to 15.1.1
```

## Code style

- Prettier defaults (no config changes — keep diffs small).
- ESLint via `eslint-config-next`.
- Components: PascalCase. Hooks: camelCase prefixed with `use`. Utility files: kebab-case.
- Prefer pure functions in `packages/engine`. Side effects belong in the React layer.

## Reporting bugs

Use GitHub Issues. For security issues, see [`SECURITY.md`](./SECURITY.md) and email instead of filing publicly.
