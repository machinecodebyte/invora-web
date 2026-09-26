# Project Runner

Complete guide to running, verifying, and troubleshooting the Invora frontend.
For the condensed version see [`../project_runner.md`](../project_runner.md).

> **Integration Phases 1 through 8 enable Auth, Products, Inventory, Sales,
> Dashboard Summary, Forecast Run/Background Jobs, Forecast Results, and
> Recommendations.** Normal flows for those slices require the backend service;
> Forecast Run and Recommendations generation also require Redis and an RQ worker.
> The deterministic frontend test suite still needs no backend, PostgreSQL, or
> Redis service.

## 1. Prerequisites

| Requirement | Minimum | Verified on | Check            |
| ----------- | ------- | ----------- | ---------------- |
| Node.js     | 20.9.0  | 24.14.0     | `node --version` |
| npm         | 10      | 11.9.0      | `npm --version`  |
| Git         | any     | —           | `git --version`  |

Disk: roughly 500 MB for `node_modules` plus about 150 MB for the Playwright
Chromium build.

No database, cache, or backend service is required for deterministic frontend
tests. Normal Auth usage requires the backend described in Section 16.

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
npm run test              # both suites
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
npx playwright test e2e/reports.spec.ts
npx playwright test e2e/sales-upload.spec.ts
npx playwright test e2e/forecast-flow.spec.ts
npx playwright test e2e/forecast-results.spec.ts
npx playwright test e2e/recommendations.spec.ts
npx playwright test e2e/recommendations.real.spec.ts
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

`/dashboard` is the protected Module 2 Dashboard route. Normal builds use the
existing authenticated client for one read-only `GET /api/v1/dashboard/summary`
request and render the backend-authoritative KPI, demand, Inventory-risk, and
reorder-alert projection. The current UI sends no Summary filters, preserving the
backend default date window. The Playwright-managed deterministic build sets
`NEXT_PUBLIC_DASHBOARD_E2E_TEST_MODE=true`; only in that build, the test service
reads serialized fixtures from browser `sessionStorage` to exercise populated,
empty, and error UI states. `PLAYWRIGHT_DASHBOARD_REAL_BACKEND=true` disables
that fixture for the separate controlled live contract spec.

### Products E2E behavior

/products is the protected Module 3 Product Catalog route. The normal Product
service uses the shared authenticated client for its approved Product endpoints. The
Playwright-managed build alone sets the Products E2E test-mode variable; its
fixture adapter reads and mutates isolated browser session storage for
deterministic list, filter, create, and edit coverage. No production Product data
or FastAPI process is used.

### Inventory E2E behavior

`/inventory` is the protected Module 4 Inventory route. The normal Inventory
service uses the shared authenticated client for item listing, the dedicated
low-stock projection, and immutable stock movements. The Playwright-managed
build alone sets `NEXT_PUBLIC_INVENTORY_E2E_TEST_MODE=true`; its deterministic
adapter reads and mutates isolated browser `sessionStorage` fixture state for
stock-movement flows. It never stores credentials or tokens, is not selected by
normal builds, and requires no FastAPI process. The separate opt-in
`inventory.real.spec.ts` validates the real flow when
`PLAYWRIGHT_INVENTORY_REAL_BACKEND=true` is explicitly set.

### Sales Upload E2E behavior

`/sales/upload` is the protected Module 5 CSV upload route. The normal
`SalesUploadService` posts browser `FormData` to the real backend with the exact
`file` field; the shared client leaves the multipart boundary browser-generated.
Fetch progress is indeterminate so no server-processing percentage is fabricated.
The Playwright-managed deterministic build alone sets
`NEXT_PUBLIC_SALES_UPLOAD_E2E_TEST_MODE=true`; its session-scoped fixture adapter
supplies deterministic progress, batch summaries, safe row errors, or a failure.
It is never selected by normal builds and requires no FastAPI process.

### Sales History component behavior

`/sales` is the protected Module 6 read-only Sales History route. Its normal
`SalesHistoryService` requests the real transaction-list and Trends endpoints;
it has no deterministic fixture mode. Unit/component tests inject isolated
transaction and trend fixtures to verify the table, filters, pagination, quantity
trend, and safe states. The opt-in `sales.real.spec.ts` uses
`PLAYWRIGHT_SALES_REAL_BACKEND=true` with controlled data to validate real upload
reconciliation. `/sales/upload` remains the separate Module 5 upload workflow.

### Forecast Run E2E behavior

`/forecasts/runs` is the protected Module 7 Forecast Run configuration and
lifecycle-status route. Its normal `ForecastRunService` uses the shared
authenticated client to create a run, enqueue its durable job, poll only active
job states every three seconds, then reconcile the authoritative Forecast Run
after a terminal job state. It never calls the synchronous process route,
Redis/RQ, worker code, or the ML implementation directly. It provides no
production forecast data, percentage progress, or result UI.

The Playwright-managed deterministic build alone sets
`NEXT_PUBLIC_FORECAST_RUN_E2E_TEST_MODE=true`; its isolated `sessionStorage`
fixture adapter is never selected by normal builds. For the optional live
contract, set `PLAYWRIGHT_FORECAST_RUN_REAL_BACKEND=true` with a controlled
FastAPI/PostgreSQL/Redis/RQ-worker stack and run
`e2e/forecast-run.real.spec.ts`.

### Forecast Results E2E behavior

`/forecasts/results` is the protected Module 8 completed-run result surface. It
requires a validated UUID `runId` query and deliberately has no “latest run”
fallback. Its normal service uses the shared authenticated client for the five
read-only persisted Forecast Results endpoints and supplies no local forecast
data. The Playwright-managed build alone sets
`NEXT_PUBLIC_FORECAST_RESULTS_E2E_TEST_MODE=true`; the adapter reads only
test-supplied, isolated `sessionStorage` fixtures for populated, empty,
not-ready, failed, and safe-error flows. Actual chart observations remain
nullable; the table does not invent actual-demand fields. Normal runtime maps
only backend-persisted overview, predictions, metrics, chart, and product detail;
it does not run ML, calculate values, or poll Results. Chart failure is isolated
from the remaining Result sections. The completed Forecast Run status links to
this route. For an opt-in live browser contract, start FastAPI, PostgreSQL,
Redis, and an RQ worker, then set
`PLAYWRIGHT_FORECAST_RESULTS_REAL_BACKEND=true` and run
`e2e/forecast-results.real.spec.ts`.

### Recommendations E2E behavior

`/recommendations` is the protected Module 9 global and run-scoped review
surface. Normal builds use the shared authenticated client for all six verified
Recommendations operations. Use a valid `forecastRunId` query from Forecast
Results to generate once with `{ refresh: false }`, then read the backend summary
and run list. The UI never calculates reorder/risk, mutates Inventory, creates a
purchase order, or automatically uses the backend refresh path. The
Playwright-managed build alone sets `NEXT_PUBLIC_RECOMMENDATIONS_E2E_TEST_MODE=true`
and uses validated, isolated `sessionStorage` fixtures.

For the opt-in real contract, start FastAPI, PostgreSQL, Redis, and an RQ worker,
then run `PLAYWRIGHT_RECOMMENDATIONS_REAL_BACKEND=true npx playwright test
e2e/recommendations.real.spec.ts`. It creates isolated authenticated
prerequisites and verifies generation, global/run reads, summary, detail, and a
supported status update through the normal UI.

### Reports component behavior

`/reports` is the protected Module 10 report-selector surface. Normal builds use
the authenticated shared client for the five verified report endpoints. Each
schema is mapped independently; CSV calls the same route with `format=csv`,
validates the Blob response type, and downloads with a safe attachment filename
or deterministic fallback. `e2e/reports.spec.ts` uses only the explicitly
build-gated deterministic fixture; it never replaces the normal adapter.

### Settings component behavior

`/settings` is the protected Module 11 route for Forecast Defaults and absolute
Safety Stock Defaults only. The normal `SettingsService` composes no endpoint,
makes no request, stores no data locally, and therefore does not display invented
defaults. Component tests inject isolated data to cover validation, valid zero
quantities, dirty/revert, save pending/success/failure, and initial load states.
No Settings E2E suite is required by roadmap; existing browser suites remain part
of the full regression. Read-only backend inspection identified the later mapping:
7/15/30 day horizon, 1-365 history days, `random_forest`/`baseline`,
auto-processing, and absolute 3-decimal safety stock.

### Shared UI / final consolidation behavior

Module 12 adds no route, business workflow, service, or backend request. It
preserves the established primitives and adds `TableScrollArea` for responsive
containment of feature-owned tables plus `Pagination` for presentation-only
previous/next controls. The feature owns table semantics and pagination query
math; the shared layer never imports feature types or API clients. Run its focused
coverage with:

```bash
npx vitest run src/tests/components/table-pagination.test.tsx
```

The full `npm run test:e2e` suite remains required because Module 12 is a
cross-feature presentation consolidation.

## 12. Full verification

```bash
npm run verify   # lint → typecheck → test → build
npm run test:e2e # separate: performs its own build
```

Expected results for Foundation + Auth + Dashboard + Products + Inventory + Sales Upload + Sales History + Forecast Run + Forecast Results + Recommendations + Reports + Settings + Shared UI consolidation:

| Step            | Expected                                                                        |
| --------------- | ------------------------------------------------------------------------------- |
| `lint`          | blocked by two pre-existing Recommendations `set-state-in-effect` errors        |
| `typecheck`     | no errors                                                                       |
| `test`          | serial regression: 60 files, 488 tests passing                                  |
| `test:coverage` | above all 85% thresholds                                                        |
| `build`         | compiles; all completed routes and the shared-UI consolidation                  |
| `test:e2e`      | 85 deterministic Chromium tests passing; 7 opt-in live specs skipped by default |

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

## 16. Integration Phase 1 Auth setup

Auth now requires a reachable FastAPI service at the configured frontend API
origin for normal login, registration, initialization, refresh, and logout.
Use matching local origins in backend CORS configuration, for example frontend
http://localhost:3000 and backend http://localhost:8000. The backend defaults
to a host-only HttpOnly refresh cookie scoped to Auth routes; production enforces
Secure cookies. Do not put tokens in frontend environment variables or browser
storage.

Only the integrated Auth, Product Catalog, and Inventory adapters make normal
requests. The standard browser suite deliberately keeps deterministic adapters;
use an opt-in live browser contract only when the backend stack is running.
