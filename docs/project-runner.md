# Project Runner

Complete guide to running, verifying, and troubleshooting the Invora frontend.
For the condensed version see [`../project_runner.md`](../project_runner.md).

> **Backend integration is intentionally NOT enabled in Foundation, Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, or Forecast Run.**
> The API client infrastructure exists and is fully tested against mocks, but no
> business endpoint is called. You do **not** need the backend, PostgreSQL, or
> Redis running to work on the frontend today. Integration lands with each
> feature module.

## 1. Prerequisites

| Requirement | Minimum | Verified on | Check            |
| ----------- | ------- | ----------- | ---------------- |
| Node.js     | 20.9.0  | 24.14.0     | `node --version` |
| npm         | 10      | 11.9.0      | `npm --version`  |
| Git         | any     | —           | `git --version`  |

Disk: roughly 500 MB for `node_modules` plus about 150 MB for the Playwright
Chromium build.

No database, cache, or backend service is required.

## 2. Environment setup

From the repository root:

```bash
cd frontend
```

Everything below runs from `frontend/`.

## 3. Dependency installation

```bash
npm install
```

CI, or any time you want an exact lockfile install:

```bash
npm ci
```

One-time Playwright browser download (separate from `npm install`):

```bash
npx playwright install chromium
```

In CI, include OS libraries:

```bash
npx playwright install --with-deps chromium
```

## 4. Environment variables

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

| Variable                   | Required | Default | Notes                                                                                  |
| -------------------------- | -------- | ------- | -------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | none    | Absolute http(s) origin, no trailing slash. Example: `http://localhost:8000`           |
| `NEXT_PUBLIC_APP_ENV`      | No       | `local` | `local` \| `development` \| `staging` \| `production`. Anything else fails validation. |

Rules:

- **`NEXT_PUBLIC_*` values are inlined into the browser bundle.** Never put a
  secret behind that prefix. Server-only secrets use unprefixed variables.
- `.env.local` is git-ignored; `.env.example` contains placeholders only. Never
  commit real values.
- Values are inlined at build time. Restart `npm run dev` (or rebuild) after any
  change.
- Validation is lazy and explicit. A missing or malformed base URL raises
  `EnvironmentConfigurationError` when a request is attempted — it does not break
  the build or an unrelated page render.
- The backend already allows `http://localhost:3000` in its `CORS_ORIGINS`, so no
  backend change is needed when integration begins.

## 5. Development server

```bash
npm run dev
```

- URL: http://localhost:3000
- Alternate port: `PORT=3001 npm run dev`

The root page reports the Foundation status, including whether the API base URL
is configured. It deliberately shows _configured / not configured_ rather than the
URL itself.

## 6. Production build

```bash
npm run build
```

- Output: `.next/`
- Fails on any TypeScript error
- Does **not** lint (Next 16 removed `next lint`); run `npm run lint` separately
- Maintains `tsconfig.json` itself (enforces `jsx: "react-jsx"`, adds generated
  type globs) — those edits are expected

## 7. Production start

```bash
npm run build
npm run start
```

Serves the existing build at http://localhost:3000. Fails if `.next/` is missing.

Smoke check:

```bash
curl -I http://localhost:3000
# expect: HTTP/1.1 200 OK, x-content-type-options: nosniff, x-frame-options: DENY
```

## 8. Lint

```bash
npm run lint
npm run lint:fix
```

Formatting:

```bash
npm run format
npm run format:write
```

Project rules ban `console` outside `src/lib/logger.ts`, ban `any`, and treat
unused variables as errors. Do not disable rules globally to get a green run.

## 9. Type checking

```bash
npm run typecheck
```

Strict, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, and
`verbatimModuleSyntax`. `any`, `@ts-ignore`, and `@ts-expect-error` are not used
anywhere in the codebase.

## 10. Unit and component tests

```bash
npm run test              # both suites (367 tests)
npm run test:unit
npm run test:components
npm run test:watch
npm run test:coverage
```

Coverage thresholds are 85% across statements, branches, functions, and lines;
the command fails below them. Reports land in `coverage/`.

## 11. E2E tests

```bash
npm run test:e2e
npm run test:e2e:ui
npx playwright test e2e/auth.spec.ts
npx playwright test e2e/dashboard.spec.ts
npx playwright test e2e/products.spec.ts
npx playwright test e2e/inventory.spec.ts
npx playwright test e2e/sales-upload.spec.ts
npx playwright test e2e/forecast-flow.spec.ts
```

Playwright builds and serves the production output by default, so the smoke test
sees exactly what users get. Overrides:

```bash
PLAYWRIGHT_WEB_SERVER_COMMAND="npm run dev" npm run test:e2e   # faster loop
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e     # external server
PLAYWRIGHT_PORT=3100 npm run test:e2e                          # different port
```

Artifacts: `playwright-report/` (HTML), `test-results/` (traces, screenshots,
videos on failure). Both are git-ignored.

### Auth E2E behavior

`e2e/auth.spec.ts` runs against the production build with the Playwright-only
`NEXT_PUBLIC_AUTH_E2E_TEST_MODE=true` flag. It selects a deterministic adapter
that stores only a test email in browser `sessionStorage` so protected navigation
survives full-page test navigation. This mode is not enabled by `.env.example`,
does not contact FastAPI, and never stores a token.

### Dashboard E2E behavior

`/dashboard` is the protected Module 2 Dashboard route. It uses the completed
Auth boundary for UX access control and the normal Dashboard service resolves to
an honest no-data state without a request. The Playwright-managed build also sets
`NEXT_PUBLIC_DASHBOARD_E2E_TEST_MODE=true`; only in that build, the test service
reads serialized fixtures from browser `sessionStorage` to exercise populated,
empty, and error UI states. No fixture is used by normal builds, and no backend
process is needed.

### Products E2E behavior

/products is the protected Module 3 Product Catalog route. The normal Product
service returns an honest unavailable state and never makes a request. The
Playwright-managed build alone sets the Products E2E test-mode variable; its
fixture adapter reads and mutates isolated browser session storage for
deterministic list, filter, create, and edit coverage. No production Product data
or FastAPI process is used.

### Inventory E2E behavior

`/inventory` is the protected Module 4 Inventory route. The normal Inventory
service never composes an endpoint or makes a request. The Playwright-managed
build alone sets `NEXT_PUBLIC_INVENTORY_E2E_TEST_MODE=true`; its deterministic
adapter reads and mutates isolated browser `sessionStorage` fixture state for
stock-movement flows. It never stores credentials or tokens, is not selected by
normal builds, and requires no FastAPI process.

### Sales Upload E2E behavior

`/sales/upload` is the protected Module 5 CSV upload route. The normal
`SalesUploadService` never composes an endpoint or sends a file. The
Playwright-managed build alone sets `NEXT_PUBLIC_SALES_UPLOAD_E2E_TEST_MODE=true`;
its deterministic, session-scoped fixture adapter supplies progress, completed
batch summaries, safe row errors, or a safe failure. It is not a mock backend,
never persists file contents, and requires no FastAPI process.

### Sales History component behavior

`/sales` is the protected Module 6 read-only Sales History route. Its normal
`SalesHistoryService` composes no endpoint and resolves to no data; it has no
Playwright fixture mode or Module 6 E2E suite. Unit/component tests inject
isolated transaction and trend fixtures to verify the table, filters, pagination,
quantity trend, and safe states without a FastAPI process. `/sales/upload`
remains the separate Module 5 upload workflow.

### Forecast Run E2E behavior

`/forecasts/runs` is the protected Module 7 Forecast Run configuration and
lifecycle-status route. Its normal `ForecastRunService` sends no request and
does not invoke an ML pipeline. The Playwright-managed build alone sets
`NEXT_PUBLIC_FORECAST_RUN_E2E_TEST_MODE=true`; its deterministic adapter reads
only test-supplied, isolated `sessionStorage` lifecycle sequences. It provides no
production forecast data, percentage progress, result UI, or backend connection.

## 12. Full verification

```bash
npm run verify   # lint → typecheck → test → build
npm run test:e2e # separate: performs its own build
```

Expected results for Foundation + Auth + Dashboard + Products + Inventory + Sales Upload + Sales History + Forecast Run:

| Step            | Expected                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `lint`          | no errors, no warnings                                                                                                      |
| `typecheck`     | no errors                                                                                                                   |
| `test`          | 42 files, 367 tests passing                                                                                                 |
| `test:coverage` | above all 85% thresholds                                                                                                    |
| `build`         | compiles; Foundation, Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, Forecast Run, and protected routes |
| `test:e2e`      | 58 tests passing in Chromium                                                                                                |

## 13. Troubleshooting

### Environment

| Symptom                                                               | Cause                                    | Fix                                   |
| --------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------- |
| `EnvironmentConfigurationError: NEXT_PUBLIC_API_BASE_URL is not set.` | No `.env.local`                          | Copy `.env.example` to `.env.local`   |
| `... must be an absolute URL, for example http://localhost:8000.`     | Relative value like `/api`               | Use a full origin                     |
| `... must use the http:// or https:// protocol.`                      | Scheme such as `ftp://`                  | Use http or https                     |
| `NEXT_PUBLIC_APP_ENV must be one of: ...`                             | Unrecognized label (e.g. `qa`)           | Use one of the four documented values |
| Page shows "API base URL: Not configured"                             | Variable unset or invalid                | Fix `.env.local`, restart the server  |
| Env edit appears to do nothing                                        | `NEXT_PUBLIC_*` is inlined at build time | Restart dev server or rebuild         |

### Install and build

| Symptom                                                        | Cause                                                                                                       | Fix                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `EBADENGINE` warning                                           | Node below a package's supported range                                                                      | Upgrade Node to 20.9+ (24.x recommended) |
| Peer dependency conflicts after upgrading TypeScript or ESLint | `eslint-config-next@16` bundles `typescript-eslint@8` (`typescript >=4.8.4 <6.0.0`, `eslint ^8.57 \|\| ^9`) | Stay on TypeScript 5.9.x and ESLint 9.x  |
| `npm run start` fails on a missing build                       | No `.next/`                                                                                                 | Run `npm run build` first                |
| `EADDRINUSE` on 3000                                           | Another process owns the port                                                                               | Stop it, or set `PORT`                   |
| Editor cannot resolve `.next/types`                            | Project never built                                                                                         | Run `npm run build` once                 |
| Stale build behavior                                           | Corrupt cache                                                                                               | Delete `.next/` and rebuild              |

### Tests

| Symptom                                     | Cause                                                                           | Fix                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| MSW: request not handled                    | A test hit an unmocked URL (this is intentional: `onUnhandledRequest: 'error'`) | Add `server.use(...)` in that test                                  |
| "not wrapped in act(...)" warning           | External store updated outside React's event system                             | Wrap the update in `act()`                                          |
| A test passes alone but fails in the suite  | Leftover state in a module-level store                                          | Clear `authStore` / `toastStore` in `afterEach`                     |
| Env-dependent test is flaky                 | `process.env` assigned directly                                                 | Use `vi.stubEnv` (auto-restored by `unstubEnvs`)                    |
| Coverage command fails while all tests pass | Below an 85% threshold                                                          | Add real tests for the uncovered branch; do not lower the threshold |

### E2E

| Symptom                                        | Cause                                                     | Fix                                                             |
| ---------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- |
| `Executable doesn't exist at ...chrome-win`    | Browser not installed                                     | `npx playwright install chromium`                               |
| Web server timeout at startup                  | Production build exceeded the 180s budget on a cold cache | Pre-build, or use `PLAYWRIGHT_WEB_SERVER_COMMAND="npm run dev"` |
| Tests run against an unexpected build          | `reuseExistingServer` picked up a running dev server      | Stop it, or set `PLAYWRIGHT_PORT`                               |
| Console-error assertion fails only in dev mode | Dev overlays and HMR emit extra console output            | Use the default production web server command                   |

## 14. Common failures to avoid

- Committing `.env.local` or any real credential.
- Adding a secret behind `NEXT_PUBLIC_`.
- Introducing business logic into `src/lib/` or `src/components/` instead of a
  feature slice.
- Adding a business model to `src/types/`.
- Importing one feature from another.
- Using `console` outside `src/lib/logger.ts`.
- Reaching for `any`, `@ts-ignore`, or `@ts-expect-error`.
- Disabling lint rules, weakening assertions, or deleting failing tests to get a
  green pipeline.
- Adding business fixtures to `src/tests/mocks/handlers.ts` before the owning
  module exists.
- Upgrading TypeScript past 5.x or ESLint past 9.x while
  `eslint-config-next@16` is in use.

## 15. Environment-specific notes

- **Windows** — developed and verified on Windows 11 with PowerShell and Git Bash.
  Use `Copy-Item` instead of `cp` in PowerShell. All scripts are cross-platform;
  no shell-specific syntax is used in `package.json`.
- **Line endings** — Prettier enforces LF (`endOfLine: "lf"`).
- **`jsdom` version** — pinned to 29.1.1 rather than 30.x, because 30.x declares
  `node ^22.22.2 || ^24.15.0 || >=26.0.0` and this environment runs Node 24.14.0.
  Revisit when Node is upgraded.
- **ESLint 9.x** — npm prints an end-of-support notice for 9.x. The pin is
  deliberate (see the peer-range note above) and can be lifted when
  `eslint-config-next` ships `typescript-eslint` v9+.
