# Invora Frontend Project Runner

Quick start for running the Invora frontend locally. For the long-form version
(including CI notes and extended troubleshooting) see
[`docs/project-runner.md`](docs/project-runner.md).

## Prerequisites

- **Node.js >= 20.9.0** (developed and verified on 24.14.0) — `node --version`
- **npm** (ships with Node; verified on 11.9.0) — `npm --version`
- Git
- A Chromium download for Playwright (one-time, see [E2E Testing](#e2e-testing))

No database, Redis, or backend service is required for the deterministic
frontend test suite. Normal Auth usage now requires the configured FastAPI
service; Dashboard, Products, Inventory, Sales Upload, Sales History, Forecast
Run, Forecast Results, Recommendations, Reports, and Settings still make no
production API calls.

## Installation

```bash
cd frontend
npm install
```

Use `npm ci` in CI for a lockfile-exact install.

## Environment Setup

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

| Variable                   | Required | Default when unset   | Purpose                                                 |
| -------------------------- | -------- | -------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | none (throws on use) | Backend origin, absolute http(s) URL, no trailing slash |
| `NEXT_PUBLIC_APP_ENV`      | No       | `local`              | `local` \| `development` \| `staging` \| `production`   |

Notes:

- `NEXT_PUBLIC_*` variables are **inlined into the browser bundle**. Never put
  secrets behind that prefix.
- `.env.local` is git-ignored. `.env.example` holds placeholders only.
- Validation is lazy: a missing or malformed `NEXT_PUBLIC_API_BASE_URL` throws an
  actionable `EnvironmentConfigurationError` when a request is attempted, rather
  than breaking the build or an unrelated page.

## Development

```bash
npm run dev
```

http://localhost:3000. Change the port with `PORT=3001 npm run dev`.

## Production Build

```bash
npm run build
```

Fails on any TypeScript error. Run `npm run lint` separately — Next 16 removed
`next lint`, so linting is its own pipeline step.

## Production Start

```bash
npm run build
npm run start
```

`npm run start` requires an existing build in `.next/`.

## Testing

```bash
npm run test              # unit + component (426 tests)
npm run test:unit         # unit only
npm run test:components   # component only
npm run test:watch        # watch mode
npm run test:coverage     # coverage, thresholds at 85%
```

Vitest runs in jsdom with React Testing Library. MSW intercepts HTTP with
`onUnhandledRequest: 'error'`, so no test can silently reach the network.

## E2E Testing

One-time browser install:

```bash
npx playwright install chromium
```

Then:

```bash
npm run test:e2e          # headless
npm run test:e2e:ui       # interactive UI mode
npx playwright test e2e/auth.spec.ts  # Auth suite only
npx playwright test e2e/dashboard.spec.ts  # Dashboard suite only
npx playwright test e2e/products.spec.ts   # Products suite only
npx playwright test e2e/inventory.spec.ts  # Inventory suite only
npx playwright test e2e/sales-upload.spec.ts # Sales Upload suite only
npx playwright test e2e/forecast-flow.spec.ts # Forecast Run suite only
npx playwright test e2e/forecast-results.spec.ts # Forecast Results suite only
npx playwright test e2e/recommendations.spec.ts # Recommendations suite only
```

By default Playwright builds the app and serves the production output, so the
smoke test sees exactly what users get. Overrides:

| Variable                        | Effect                                        |
| ------------------------------- | --------------------------------------------- |
| `PLAYWRIGHT_WEB_SERVER_COMMAND` | Use `npm run dev` for a faster local loop     |
| `PLAYWRIGHT_BASE_URL`           | Target an already-running server              |
| `PLAYWRIGHT_PORT`               | Change the managed server port (default 3000) |

## Linting

```bash
npm run lint
npm run lint:fix
npm run format        # Prettier check
npm run format:write  # Prettier write
```

## Type Checking

```bash
npm run typecheck
```

Strict mode plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noUnusedLocals`, `noUnusedParameters`, and `verbatimModuleSyntax`.

## Everything at once

```bash
npm run verify   # lint → typecheck → test → build
```

## Troubleshooting

| Symptom                                                              | Cause                                              | Fix                                               |
| -------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| `EnvironmentConfigurationError: NEXT_PUBLIC_API_BASE_URL is not set` | No `.env.local`                                    | `cp .env.example .env.local`                      |
| `NEXT_PUBLIC_API_BASE_URL must be an absolute URL`                   | Relative value such as `/api`                      | Use a full origin, e.g. `http://localhost:8000`   |
| Root page shows "API base URL: Not configured"                       | Same as above                                      | Set the variable and restart the dev server       |
| Env change has no effect                                             | `NEXT_PUBLIC_*` values are inlined at build time   | Restart `npm run dev`, or rebuild                 |
| `npm run start` fails with a missing-build error                     | No production build                                | Run `npm run build` first                         |
| `Executable doesn't exist at ...chrome-win`                          | Playwright browser not installed                   | `npx playwright install chromium`                 |
| E2E times out at startup                                             | Production build takes longer than the 180s budget | Use `PLAYWRIGHT_WEB_SERVER_COMMAND="npm run dev"` |
| E2E fails with `EADDRINUSE` / picks up a stale server                | A dev server already owns port 3000                | Stop it, or set `PLAYWRIGHT_PORT`                 |
| MSW error: "request not handled"                                     | A test hit an unmocked URL                         | Add a handler with `server.use(...)` in that test |
| Editor reports missing `.next/types`                                 | Project not built yet                              | Run `npm run build` once                          |
| `EBADENGINE` on install                                              | Node older than 20.9                               | Upgrade Node                                      |

## Current Foundation Scope

Implemented:

- App Router shell with metadata, viewport, error/not-found/loading routes
- Tailwind CSS 4 design tokens with light and dark palettes
- Accessible UI primitives: Button, Input, Label, Select, Textarea, Dialog,
  Card, Spinner, Skeleton, EmptyState, ErrorState, Toaster, TableScrollArea,
  Pagination
- Layout primitives: AppShell, Header, MainContent, PageContainer
- Typed API client: timeouts, cancellation, envelope unwrapping, normalized errors
- `ApiError` model with status, code, validation details, and correlation id
- TanStack Query client with dashboard-appropriate defaults
- Auth infrastructure (in-memory session store, no endpoints, no network calls)
- React Hook Form + Zod validation pattern with API-error mapping
- Logging abstraction with credential redaction
- Vitest, React Testing Library, MSW, and Playwright harness

**Deliberately not implemented:** real Settings/default persistence;
any business API call; any production business data, real or dummy.

**Backend integration is intentionally NOT enabled in Foundation.** The API
client exists and is tested against mocks, but no business endpoint is called.
Integration lands with each feature module.

## Current Auth Scope

Implemented:

- `/login` and `/register` with React Hook Form, Zod, accessible validation, and
  backend-aligned email/password rules
- Auth provider/action state over the existing in-memory session store
- Local logout, public-only Auth routes, safe redirect validation, and protected
  route UX
- Unit, component, and Playwright Auth tests with a deterministic test-only
  adapter

**Real backend Auth integration is enabled.** The normal adapter uses the
shared client, memory-only access token, and HttpOnly refresh-cookie contract.
The Playwright-only adapter remains selected only for its managed deterministic
E2E build and persists only a test email, never a token.

For the optional live browser contract run, start the backend/database, set
PLAYWRIGHT_AUTH_REAL_BACKEND to true and NEXT_PUBLIC_API_BASE_URL to the backend
origin, then run the Auth live spec. This is the only real frontend integration;
all business modules remain disabled.

## Current Dashboard Scope

Implemented:

- Protected `/dashboard`, reusing the completed Auth provider and access boundary
- Data-driven KPI cards, responsive demand chart, reorder-alert summary, and
  high-risk inventory summary aligned to Dashboard Analytics response semantics
- Explicit loading skeleton plus empty and safe error states
- Strongly typed `DashboardService` boundary, ready for future API/TanStack Query
  integration; normal builds make no Dashboard request and show no fake data
- Dashboard component and Playwright tests, including authenticated, populated,
  empty, error, protected-route, and mobile flows

**Real Dashboard Analytics integration is intentionally not enabled.** The
Playwright-only service is selected exclusively in its managed test build and
reads isolated fixture data from session storage. It is never selected by normal
application builds.

## Current Products Scope

Implemented:

- Protected /products route using the established Auth boundary and app shell
- Responsive Product Catalog table with search and active-status filters
- React Hook Form and Zod create/edit form for backend-aligned Product fields
- Loading, empty, filtered-empty, and safe error states; create/edit pending
  states and a reusable accessible dialog
- Typed no-network Product service contract and Product component and Playwright
  tests, including deterministic test-only create/edit behavior

**Real Product Catalog API integration is intentionally not enabled.** Normal
builds make no Product request and do not persist local Product writes. The
Playwright-only adapter is selected only by the managed E2E build and uses
isolated session-scoped fixture state, never a token or production Product data.

## Current Inventory Scope

Implemented:

- Protected `/inventory` route using the established Auth boundary and app shell
- Responsive semantic stock table with backend-supported search and stock-status
  filters plus a dedicated low-stock view
- React Hook Form and Zod stock-movement form aligned to positive stock-in/out,
  absolute non-negative adjustment, non-zero signed correction, and three-decimal
  quantity rules
- Loading, empty, filtered-empty, low-stock empty, safe error, and update-pending
  states with accessible field/form feedback
- Typed no-network Inventory service contract and deterministic test-only
  Playwright fixture adapter with component and browser tests

**Real Inventory API integration is intentionally not enabled.** Normal builds
make no Inventory request and do not persist local stock writes. The
Playwright-only adapter is selected only by the managed E2E build and uses
isolated session-scoped fixture state, never a token or production Inventory data.

## Current Sales Upload Scope

Implemented:

- Protected `/sales/upload` route using the existing Auth boundary and app shell
- One-file CSV selection with backend-aligned extension, MIME, 5 MiB, and required
  header preflight checks
- Explicit validating, ready, uploading, success, validation-error, and safe
  failure states; semantic progress; reset and retry controls
- Safe upload-batch summary and bounded rejected-row feedback without raw CSV data
- Typed no-network service contract plus deterministic component and Playwright tests

**Real Sales Upload API integration is intentionally not enabled.** The normal
service never sends or persists a file. Only the Playwright-managed build selects
a test-only session fixture adapter; it does not contact FastAPI or retain file
contents after the browser test.

## Current Sales History Scope

Implemented:

- Protected `/sales` route using the existing Auth boundary and app shell
- Read-only, responsive semantic transaction table with safe public fields
- Product/SKU search, source and inclusive date filters with date-range feedback
- Backend-aligned offset/limit pagination infrastructure and accessible quantity trend
- Independent table/chart loading, empty, filtered-empty, and safe error states
- Typed no-network service boundary with deterministic unit/component fixtures

**Real Sales Transaction API integration is intentionally not enabled.** The
normal service makes no request and renders no fake sales. Sales History has
component coverage only by roadmap; completed Modules 1–5 E2E suites remain part
of full regression.

## Current Forecast Run Scope

Implemented:

- Protected `/forecasts/runs` route using the existing Auth boundary and app shell
- React Hook Form and Zod horizon selection limited to the inspected backend's
  global 7-, 15-, and 30-day options
- Explicit frontend action states and text-only `pending`, `running`,
  `completed`, `failed`, and `cancelled` lifecycle presentation; no invented
  percentage progress
- Start, manual status refresh, safe failure feedback, and reset/start-another
  behavior without Forecast Results UI
- Typed no-network service boundary plus deterministic unit, component, and
  Playwright lifecycle fixtures

**Real Forecast Run API and ML pipeline integration are intentionally not
enabled.** Normal builds create no local forecast run and make no request. The
Playwright-only adapter is selected only by the managed E2E build and reads
isolated session-scoped lifecycle data; it contains no production forecast data.

## Current Forecast Results Scope

Implemented:

- Protected `/forecasts/results` route using the existing Auth boundary and app shell
- Validated UUID `runId` selection with no latest-run guessing or untrusted route use
- Completed-run summary, backend-produced MAE/RMSE/MAPE, responsive prediction table,
  product/SKU and inclusive forecast-date filters, offset/limit pagination, and an
  accessible actual-versus-predicted SVG chart
- Explicit loading, no-selection, invalid-id, empty, not-ready, failed-run, filtered-empty,
  and safe error states; zero values stay visible and missing actuals remain unavailable
- Typed no-network service boundary plus deterministic unit/component and Playwright fixtures

**Real Forecast Results API and ML pipeline integration are intentionally not
enabled.** Normal builds make no request and contain no forecast result data.
Only the Playwright-managed test build reads isolated session-scoped fixtures;
it never contacts FastAPI or stores production forecast data.

## Current Recommendations Scope

Implemented:

- Protected `/recommendations` route using the existing Auth boundary and app shell
- Read-only responsive risk/status table with Product/SKU search, exact backend
  risk/status filters, and backend-shaped offset/limit pagination
- Backend-generated reorder quantities shown with valid zeroes and up to three
  decimal places; nullable reasons have a safe fallback
- Loading, empty, filtered-empty, and safe error states with semantic table and
  accessible controls
- Typed no-network service contract plus deterministic unit/component and
  Playwright fixtures

**Real Recommendations API integration is intentionally not enabled.** Normal
builds make no request, contain no recommendation data, and do not calculate
risk/reorder quantities or perform recommendation actions. Only the
Playwright-managed test build reads isolated session-scoped fixtures; it never
contacts FastAPI or stores production recommendation data.

## Current Reports Scope

Implemented:

- Protected `/reports` route using the existing Auth boundary and app shell
- Single report selector for model performance, inventory risk, reorder summary,
  demand forecast, and sales summary output
- Report-specific backend-supported filters, semantic table/summary rendering,
  and loading, empty, filtered-empty, validation, and safe error states
- CSV-only export action with pending, deterministic test-success, and safe
  failure states; it prevents duplicate export and creates no production download
- Typed no-network Reports/export service contract with isolated component fixtures

**Real Reports API and export integration are intentionally not enabled.** The
normal service makes no report/export request and cannot manufacture data,
files, or downloads. Module 10 requires component coverage only; existing
Playwright suites remain part of full frontend regression.

## Current Settings Scope

Implemented:

- Protected `/settings` route using the existing Auth boundary and app shell
- Forecast Defaults: 7/15/30-day horizon, 1-365-day history window,
  backend-supported model default, and auto-processing default
- Safety Stock Defaults: absolute non-negative Decimal quantity with up to three
  decimal places; zero remains valid
- RHF + Zod validation, independent dirty, saving, safe success/failure, and
  revert states, plus accessible loading/error states
- Typed no-network Settings service boundary and deterministic component fixtures

**Real Settings/default persistence integration is intentionally not enabled.**
The normal service makes no request, stores nothing in local or session storage,
and does not manufacture business defaults. No Settings E2E suite was added
because Module 11 requires component testing; all existing Playwright suites are
still rerun as the frontend regression gate.

## Current Shared UI / Final Consolidation Scope

Implemented:

- Completed non-destructive audit of shared Button, Input, Label, Select,
  Textarea, Card, Dialog, Spinner, Skeleton, EmptyState, ErrorState, Toaster,
  and layout primitives
- `TableScrollArea` for generic responsive horizontal containment around
  feature-owned semantic tables
- `Pagination` for accessible, presentation-only previous/next controls while
  features retain offset/limit calculations and query state
- Focused component coverage plus the full existing Chromium regression suite

Feature-specific badges, native upload progress, forecast lifecycle state,
charts, and form layouts remain in the owning feature because they have no safe
generic contract. Module 12 adds no route, provider, store, API call, backend
connection, or business data.

**Current project status:** Frontend implementation modules 0-12 are complete.
Integration Phase 1 is complete for Foundation transport and Auth & Identity. Business-module integration remains the next separate phase.
