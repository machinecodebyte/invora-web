# Commands

All commands run from the `frontend/` directory.

## Package manager

This project uses **npm**.

The repository had no existing JavaScript package manager when the frontend was
created — the backend is Python (`pip`/`pyproject.toml`) and `frontend/` was
empty — so npm was chosen because it ships with Node and needs no extra install.
`package-lock.json` is the committed lockfile.

**Do not switch package managers.** Mixing npm with pnpm or yarn produces
conflicting lockfiles and divergent dependency trees. If a switch is ever needed,
it should be a deliberate, standalone change that removes the old lockfile.

| Task                      | Command                |
| ------------------------- | ---------------------- |
| Install                   | `npm install`          |
| Reproducible install (CI) | `npm ci`               |
| Add a dependency          | `npm install <pkg>`    |
| Add a dev dependency      | `npm install -D <pkg>` |
| Run a script              | `npm run <script>`     |
| One-off binary            | `npx <bin>`            |

## Dependency installation

```bash
npm install
```

Requires Node >= 20.9.0. Verified on Node 24.14.0 with npm 11.9.0.

For a clean, lockfile-exact install:

```bash
npm ci
```

One-time Playwright browser download (not covered by `npm install`):

```bash
npx playwright install chromium
```

## Development server

```bash
npm run dev
```

Starts Next.js (Turbopack) at http://localhost:3000. Use a different port with
`PORT=3001 npm run dev`.

`NEXT_PUBLIC_*` values are inlined at build time — restart the server after
changing `.env.local`.

## Production build

```bash
npm run build
```

Produces the optimized build in `.next/`. Fails on any TypeScript error.

Note: Next 16 removed `next lint`, so `npm run build` does **not** lint. Run
`npm run lint` as its own step.

## Production start

```bash
npm run build
npm run start
```

`npm run start` serves the existing build and fails if `.next/` is absent.

## Lint

```bash
npm run lint       # report
npm run lint:fix   # auto-fix what is fixable
```

ESLint 9 flat config (`eslint.config.mjs`) composing
`eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`, plus
project rules: `no-console` (the logger is the only sanctioned console boundary),
`no-alert`, `@typescript-eslint/no-explicit-any`, enforced `import type`, unused
variables as errors with an `^_` escape, `eqeqeq`, `prefer-const`,
`object-shorthand`.

## Format

```bash
npm run format        # check only
npm run format:write  # rewrite files
```

Prettier 3 with `.prettierrc.json` (single quotes, semicolons, trailing commas,
88-column width, LF endings).

## Type checking

```bash
npm run typecheck
```

`tsc --noEmit` in strict mode plus `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noUnusedLocals`,
`noUnusedParameters`, `noFallthroughCasesInSwitch`, and
`verbatimModuleSyntax`.

`next build` maintains `tsconfig.json` itself — it enforces `jsx: "react-jsx"`
and adds generated type globs. Those edits are expected; keep them.

## Unit tests

```bash
npm run test:unit
```

Runs `src/tests/unit/**`.

## Component tests

```bash
npm run test:components
```

Runs `src/tests/components/**`.

## All Vitest tests

```bash
npm run test
```

Unit + component in one pass (currently 357 tests).

Run the Auth-focused Vitest files without changing package scripts:

```bash
npx vitest run src/tests/unit/auth-schemas.test.ts src/tests/unit/auth-api.test.ts src/tests/unit/auth-redirects.test.ts
npx vitest run src/tests/components/auth-forms.test.tsx src/tests/components/auth-boundaries.test.tsx
```

Run the Dashboard-focused Vitest files:

```bash
npx vitest run src/tests/unit/dashboard-api.test.ts src/tests/components/dashboard.test.tsx
npx vitest run src/tests/unit/products-schemas.test.ts src/tests/unit/products-api.test.ts src/tests/components/products.test.tsx src/tests/components/dialog.test.tsx
npx vitest run src/tests/unit/inventory-schemas.test.ts src/tests/unit/inventory-api.test.ts src/tests/components/inventory.test.tsx
npx vitest run src/tests/unit/sales-upload-schemas.test.ts src/tests/unit/sales-upload-api.test.ts src/tests/components/sales-upload.test.tsx
npx vitest run src/tests/unit/sales-history-schemas.test.ts src/tests/unit/sales-history-api.test.ts src/tests/components/sales-history.test.tsx
```

## Watch mode

```bash
npm run test:watch
```

## Coverage

```bash
npm run test:coverage
```

v8 coverage over `lib/`, `hooks/`, `components/`, and `types/`. Thresholds are
85% for statements, branches, functions, and lines; the command fails below them.
Reports: terminal summary, `coverage/index.html`, and `coverage/lcov.info` for CI.

## Playwright tests

```bash
npm run test:e2e
```

By default this **builds the app and serves the production output**, so the first
run takes longer. Faster local iteration against the dev server:

```bash
PLAYWRIGHT_WEB_SERVER_COMMAND="npm run dev" npm run test:e2e
```

Against an already-running server:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

Useful flags:

```bash
npx playwright test --headed                  # visible browser
npx playwright test --debug                   # step through
npx playwright test e2e/foundation.spec.ts    # single file
npx playwright test e2e/auth.spec.ts          # Auth E2E suite
npx playwright test e2e/dashboard.spec.ts     # Dashboard E2E suite
npx playwright test e2e/products.spec.ts      # Products E2E suite
npx playwright test e2e/inventory.spec.ts     # Inventory E2E suite
npx playwright test e2e/sales-upload.spec.ts  # Sales Upload E2E suite
npx playwright show-report                    # last HTML report
```

## Playwright UI

```bash
npm run test:e2e:ui
```

Interactive runner with time-travel debugging and a DOM snapshot per step.

## Full verification

```bash
npm run verify
```

Runs `lint` → `typecheck` → `test` → `build` and stops at the first failure. Run
this before opening a pull request.

E2E is excluded from `verify` because it performs its own build; run
`npm run test:e2e` separately.

## Environment variables

| Variable                        | Used by        | Purpose                                               |
| ------------------------------- | -------------- | ----------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`      | app, build     | Backend origin; absolute http(s) URL                  |
| `NEXT_PUBLIC_APP_ENV`           | app            | `local` \| `development` \| `staging` \| `production` |
| `PORT`                          | `dev`, `start` | Server port (default 3000)                            |
| `CI`                            | Playwright     | Enables retries, single worker, `forbidOnly`          |
| `PLAYWRIGHT_BASE_URL`           | Playwright     | Target an external server                             |
| `PLAYWRIGHT_PORT`               | Playwright     | Managed server port                                   |
| `PLAYWRIGHT_WEB_SERVER_COMMAND` | Playwright     | Override the managed server command                   |

## Suggested CI order

```bash
npm ci
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npx playwright install --with-deps chromium
npm run test:e2e
```
