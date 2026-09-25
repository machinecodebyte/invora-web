# Invora Frontend

**Predict · Optimize · Replenish**

Frontend for Invora, an AI-based demand forecasting and inventory reorder
recommendation system for small-business inventory management.

## Current status

**Frontend Module 12 - Shared UI / final frontend consolidation: COMPLETED.**
All frontend implementation modules 0-12 are complete. Integration Phases 1,
2/2B, 3, 4, 5, 6, 7, and 8 connect Foundation/Auth, Product Catalog, Inventory,
Sales Upload/Sales History, Dashboard Summary, Forecast Run/Background Jobs,
and Forecast Results respectively; later business integrations remain separate.

**Frontend Module 10 — Reports: COMPLETED.**

**Frontend Module 0 — Foundation: COMPLETED.**
**Frontend Module 1 — Auth: COMPLETED.**
**Frontend Module 2 — Dashboard: COMPLETED.**
**Frontend Module 3 — Products: COMPLETED.**

**Frontend Module 4 — Inventory: COMPLETED.**

**Frontend Module 5 — Sales Upload: COMPLETED.**

**Frontend Module 6 — Sales History: COMPLETED.**

**Frontend Module 7 — Forecast Run: COMPLETED.**
**Frontend Module 8 — Forecast Results: COMPLETED.**
**Frontend Module 9 — Recommendations: COMPLETED.**

The frontend currently contains Foundation, Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, Forecast Run, Forecast Results, Recommendations, Reports, and Settings: the application
shell, shared primitives, API/client infrastructure, login and registration
routes, local logout, protected-route UX, and a responsive Dashboard composed
from typed KPIs, demand trend, reorder alerts, inventory risk, and explicit
loading, empty, and error states. Module 3 adds a protected Product Catalog with
create/edit forms, backend-aligned list filters, and explicit loading, empty, and
error states. Module 4 adds protected Inventory monitoring with backend-aligned
stock status, search/status filters, a dedicated low-stock view, and immutable
stock-movement updates validated with React Hook Form and Zod. Module 5 adds a
protected CSV selection and preflight experience with truthful upload state, safe
result summaries, and rejected-row feedback. Normal builds submit the selected
file through the real Sales Upload contract. Module 6 adds a protected read-only Sales History table,
backend-aligned product/SKU search, source and inclusive date filters, offset/limit
pagination infrastructure, and a quantity-trend chart. Normal builds retrieve
Sales Transactions and backend-owned trends through the shared authenticated client. Module 7 adds a protected
Forecast Run form with backend-aligned 7-, 15-, and 30-day horizons, explicit
pending/running/completed/failed lifecycle presentation, manual status refresh,
and real background-job tracking. Normal builds create a run, enqueue the
backend-owned job, poll active job state, and reconcile the authoritative run;
they never call the synchronous processing endpoint or contain forecast data.
Module 8 adds a protected completed-run results route with backend-authoritative
summary, MAE/RMSE/MAPE, paginated prediction rows, an accessible
actual-versus-predicted chart that preserves missing actual observations, and
on-demand product result detail. Normal builds use the shared authenticated
client to read persisted Forecast Results; they do not invoke ML processing or
calculate predictions, metrics, or chart values.

Module 9 adds a protected Recommendations route with backend-aligned five-level
risk presentation, Product/SKU search, risk/status filtering, offset/limit
pagination, run-specific generation and summary, on-demand detail, and only the
backend-confirmed acknowledge/dismiss actions. Normal builds use the shared
authenticated client for the complete verified Recommendations contract; risk,
recommended action, reorder quantity, and persistence remain backend-owned.

Recommendations now uses the shared API client. Auth, Dashboard, Products, Inventory, Sales Upload, Sales History,
Forecast Run, and Forecast Results are connected through the shared API client
and the backend's HttpOnly refresh-cookie contract. Dashboard consumes
the backend-authoritative read-only Summary projection; its fixtures remain
isolated to component and Playwright infrastructure. See
[`docs/progress.md`](docs/progress.md) for per-module status.

The deterministic Recommendations fixture remains selected only by the
Playwright-managed test build; normal builds never fall back to it.

Module 10 adds the protected `/reports` route, one selector for the five
backend-defined report views, report-specific filters, semantic report tables,
backend-provided summary metrics, and a CSV-only export interaction boundary.
The normal Reports service is unavailable by design: it makes no request and
does not manufacture report rows, files, or downloads. Deterministic Reports
fixtures exist only in the unit/component test infrastructure.

Module 12 completes a non-destructive Shared UI audit. The existing Button,
Input, Label, Select, Card, Dialog, Spinner, Skeleton, EmptyState, ErrorState,
and Toaster primitives remain canonical. `TableScrollArea` now owns only the
responsive horizontal boundary around feature-owned semantic tables, and
`Pagination` owns only generic previous/next presentation. Product, Inventory,
Sales, Forecast Results, Recommendations, and Reports retain their table
columns, formatting, query state, and business semantics.

## Technology stack

| Concern         | Choice                                    |
| --------------- | ----------------------------------------- |
| Framework       | Next.js 16 (App Router)                   |
| Language        | TypeScript 5.9 (strict)                   |
| UI runtime      | React 19                                  |
| Styling         | Tailwind CSS 4 (CSS-first configuration)  |
| Server state    | TanStack Query 5                          |
| Forms           | React Hook Form 7 + Zod 4                 |
| Unit/component  | Vitest 4 + React Testing Library          |
| API mocking     | MSW 2                                     |
| End-to-end      | Playwright 1.62 (Chromium)                |
| Lint / format   | ESLint 9 (`eslint-config-next`), Prettier |
| Package manager | npm                                       |

## Quick start

```bash
cd frontend
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev
```

The app runs at http://localhost:3000.

Full setup and troubleshooting: [`project_runner.md`](project_runner.md).

## Environment

| Variable                   | Required | Purpose                                                   |
| -------------------------- | -------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | Backend origin, e.g. `http://localhost:8000`              |
| `NEXT_PUBLIC_APP_ENV`      | No       | `local` (default), `development`, `staging`, `production` |

`NEXT_PUBLIC_*` values are inlined into the browser bundle — never place secrets
behind that prefix. `.env.example` contains placeholders only.

## Commands

| Command                   | Purpose                         |
| ------------------------- | ------------------------------- |
| `npm run dev`             | Development server              |
| `npm run build`           | Production build                |
| `npm run start`           | Serve the production build      |
| `npm run lint`            | ESLint                          |
| `npm run typecheck`       | `tsc --noEmit`                  |
| `npm run test`            | Unit + component tests          |
| `npm run test:unit`       | Unit tests only                 |
| `npm run test:components` | Component tests only            |
| `npm run test:watch`      | Watch mode                      |
| `npm run test:coverage`   | Coverage report                 |
| `npm run test:e2e`        | Playwright E2E                  |
| `npm run test:e2e:ui`     | Playwright interactive UI       |
| `npm run verify`          | lint → typecheck → test → build |

Details: [`docs/commands.md`](docs/commands.md).

## Architecture

```text
src/
  app/          Routes, layouts, providers (App Router)
  components/
    layout/     AppShell, Header, MainContent, PageContainer
    ui/         Button, Input, Label, Select, Textarea, Dialog, Card, Spinner, Skeleton, EmptyState, ErrorState, Toaster, TableScrollArea, Pagination
  features/     Auth, Dashboard, Products, Inventory, Sales, Forecasting, Recommendations, and Reports vertical slices plus future-module placeholders
  hooks/        Shared hooks (use-auth, use-toast)
  lib/          api-client, api-error, query-client, auth, env, forms, logger, toast, constants, utils
  types/        Generic transport and utility types
  tests/        Unit tests, component tests, MSW mocks, setup
e2e/            Playwright specs
```

Server Components are the default; `'use client'` is applied only where
interactivity or subscriptions require it. Business models live in the feature
that owns them, never in `src/types`.

Full rationale: [`docs/architecture.md`](docs/architecture.md).

## Testing

Module 12 adds focused coverage for the responsive table boundary and generic
pagination controls. The latest full coverage run contains 463 unit/component
tests; the deterministic Chromium regression contains 78 passed scenarios, with
five opt-in live-backend specs skipped by default. Configured coverage exceeds
the required 85% threshold for every measured metric.

```bash
npm run test
npm run test:coverage
npm run test:e2e
```

Strategy and per-module plan: [`docs/testing.md`](docs/testing.md).

## Documentation

| Document                                           | Contents                              |
| -------------------------------------------------- | ------------------------------------- |
| [`docs/README.md`](docs/README.md)                 | Documentation index                   |
| [`docs/architecture.md`](docs/architecture.md)     | Structure, layering, strategies       |
| [`docs/testing.md`](docs/testing.md)               | Test stack, scope, future plan        |
| [`docs/commands.md`](docs/commands.md)             | Every command, with notes             |
| [`docs/project-runner.md`](docs/project-runner.md) | Detailed run and troubleshooting flow |
| [`docs/progress.md`](docs/progress.md)             | Module status tracking                |
| [`project_runner.md`](project_runner.md)           | Developer quick start                 |

## Backend

The backend is a separate FastAPI modular monolith in `../backend` and is already
complete. Auth fields, Dashboard Analytics summary semantics, Product Catalog
validation/list semantics, Inventory movement/low-stock semantics, Sales Upload
CSV requirements, Sales Transaction list/trend semantics, Forecast Run lifecycle semantics, and Forecast Results
horizon/lifecycle semantics were aligned through read-only inspection. Frontend
Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, and Forecast
Run and Forecast Results now use the real FastAPI endpoints. See
[`docs/architecture.md`](docs/architecture.md) for the integration plan.

Recommendations risk levels, list filters, response-safe fields, nullable reason,
three-decimal quantity semantics, generation policy, run summary, detail, and
status transition rules were aligned through read-only backend inspection. The
frontend now calls only the verified Recommendations API routes at runtime.

Reports contract inspection established model-performance, inventory-risk,
reorder-summary, demand-forecast, and sales-summary views. The backend exposes
synchronous `text/csv` attachments as its sole export format. The frontend does
not call Reports or export endpoints at runtime.

## Integration Phase 1 - Foundation transport and Auth

The normal Auth adapter now calls the FastAPI Auth contract through the existing
shared API client. Access tokens remain in browser memory only. The backend
sets, rotates, and clears an HttpOnly refresh cookie scoped to the Auth API
prefix; the browser sends it only on refresh and logout requests using browser
credentials.

On initialization the Auth provider refreshes first, then verifies the current
user, so protected routes wait for that result. A protected request retries once
only after the backend signals an invalid or expired access token, and concurrent
recoveries are coalesced. Logout and unrecoverable recovery clear only
auth-scoped TanStack Query entries, not public/static cache entries.

The test-only E2E adapters remain opt-in. Products, Inventory, and Sales are the
integrated business features; Dashboard, Forecasting, Recommendations, Reports,
and Settings remain unintegrated.

## Integration Validation

Phase 1 — Foundation + Auth: validated.

Phase 2 — Product Catalog: validated.

Phase 2B — Product Extended: validated. Product detail and archive, category
create/list/update/archive, and backend-driven Product units now use the shared
authenticated Product adapter. Product browser E2E coverage remains
deterministic and test-only; normal application builds use the FastAPI adapter.

At the Phase 2 checkpoint, Inventory, Sales, Dashboard, Forecast Run, Forecast
Results, Recommendations, Reports, and Settings were still pending.

Phase 3 — Inventory: validated. The normal Inventory adapter lists
backend-owned inventory and low-stock projections and records immutable stock
movements through the shared authenticated client. Successful movements
invalidate only Inventory query keys; the normal UI never calculates stock or
low-stock state locally.

Phase 4 â€” Sales Upload + Sales History: validated. Normal builds use the
shared authenticated client for multipart CSV upload, transaction list, and
backend-owned daily trends. The live adapter maps Decimal-compatible fields and
calendar-date strings at the Sales boundary; it never calls Inventory APIs.

Phase 5 — Dashboard Summary: validated. Normal builds use one authenticated
`GET /api/v1/dashboard/summary` request and map its backend-authoritative KPI,
demand-trend, Inventory-risk, and reorder-alert projection at the Dashboard
boundary. Forecast Overview and Recent Activity remain intentionally unrendered
because the existing Module 2 UI has no sections for them.

At the Phase 5 checkpoint, Forecast Run, Forecast Results, Recommendations,
Reports, and Settings were still pending. Phase 6 subsequently integrated
Forecast Run and Background Jobs; the next integration phase is Forecast
Results.

## Latest Integration Audit Status

Phase 1 (Foundation transport + Auth) and Phase 2 (Product Catalog core) were
revalidated against the current checkout. The normal frontend completed a real
Auth registration, refresh-cookie session restoration, Product create/update,
and logout flow against an isolated current backend instance. Auth and Product
unit/component suites, backend contract tests, Chromium E2E coverage, lint,
strict TypeScript, and the normal production build passed.

The local backend process at `http://localhost:8000` was found to be stale: it
omitted the Auth refresh cookie even though the current checked-out backend
source correctly emits it. Restart that local process from the current backend
checkout before manual frontend integration testing. No application source or
backend files were changed by this audit.

## Integration Phase 6 - Forecast Run + Background Jobs

Normal Forecast Run builds now use the shared authenticated client for the
backend-owned asynchronous lifecycle:

1. `POST /api/v1/forecast-runs` creates the run.
2. `POST /api/v1/jobs/forecast-runs/{runId}` enqueues its durable worker job.
3. `GET /api/v1/jobs/{jobId}` is polled every three seconds only while the job
   is `queued`, `started`, or `retrying`.
4. Every terminal job state is reconciled with
   `GET /api/v1/forecast-runs/{runId}` before the UI presents run state.

The browser never calls `/forecast-runs/{runId}/process`, Redis, RQ, or ML
implementation code. A queue failure keeps the newly created run visible with a
safe retry-free message; manual refresh remains an authoritative run read. The
deterministic fixture adapter remains limited to the Playwright-managed build.
`e2e/forecast-run.real.spec.ts` is an opt-in controlled-environment contract
requiring the backend, PostgreSQL, Redis, and an RQ worker. Forecast Results,
Recommendations, Reports, Settings, and all other deferred integrations remain
unchanged. Phase 6 validation passed the 463-test coverage suite, the complete
78-scenario deterministic Chromium regression (five opt-in live specs skipped),
strict type checking, lint, and a production build. Backend source remained
unchanged throughout.

## Integration Phase 7 - Forecast Results

Normal Forecast Results builds use the shared authenticated client for the five
read-only persisted-result endpoints: run overview, paginated predictions,
metrics, actual-versus-predicted chart data, and on-demand product detail. The
adapter validates FastAPI envelopes and decimal/date-only fields before mapping
them to feature models. It keeps a chart failure isolated so summary,
predictions, and metrics remain usable; an absent metrics record is shown as
unavailable rather than manufactured client-side.

The completed Forecast Run status now links to its validated Results route. The
page performs no Result polling, mutation, ML invocation, recommendation call,
or client-side forecast calculation. Product detail is the only new Results UI:
an accessible dialog opened from a prediction row. Deterministic fixtures remain
Playwright-only; `e2e/forecast-results.real.spec.ts` is an opt-in live browser
contract requiring FastAPI, PostgreSQL, Redis, and an RQ worker.

## Integration Phase 8 - Recommendations

The normal Recommendations service now uses the established authenticated API
client for generation, global and run-scoped lists, a run summary, on-demand
detail, and supported status updates. A completed Forecast Results screen links
to `/recommendations?forecastRunId=...`; that run-scoped screen validates the
UUID, permits one explicit generation request with `{ refresh: false }`, and
loads existing recommendations after a generation conflict rather than silently
refreshing them. Recommendation actions never update Inventory or create a
purchase order.

The deterministic fixture adapter is selected only by the Playwright build.
`e2e/recommendations.real.spec.ts` is an opt-in browser contract requiring
FastAPI, PostgreSQL, Redis, and an RQ worker. Reports, Settings, User Profile,
and all other deferred integrations remain outside Phase 8.
