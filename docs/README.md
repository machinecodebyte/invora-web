# Frontend Documentation

Documentation for the Invora frontend: what it is, how it is structured, how to
run it, and how it is tested.

| Document                                 | Contents                                                                                                                         |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`architecture.md`](architecture.md)     | Feature-based structure, layering rules, server/client strategy, API client and TanStack Query design, future module integration |
| [`testing.md`](testing.md)               | Vitest, RTL, MSW, and Playwright; what exists today; the per-module test plan                                                    |
| [`commands.md`](commands.md)             | Every command, what it does, and package-manager notes                                                                           |
| [`project-runner.md`](project-runner.md) | Full setup, run, verification, and troubleshooting flow                                                                          |
| [`progress.md`](progress.md)             | Module-by-module implementation status                                                                                           |

Also see [`../project_runner.md`](../project_runner.md) for the condensed
developer quick start, and [`../README.md`](../README.md) for the project
overview.

## What the frontend is

A Next.js App Router application that will consume the Invora backend's REST API
to deliver demand forecasting and inventory reorder recommendations to
small-business users. The backend (`../backend`) is a complete FastAPI modular
monolith; the frontend is built module by module against it.

## Technology stack

- **Next.js 16** — App Router, Server Components by default
- **TypeScript 5.9** — strict, with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`
- **React 19**
- **Tailwind CSS 4** — CSS-first configuration with semantic design tokens
- **TanStack Query 5** — server state, caching, retries
- **React Hook Form 7 + Zod 4** — type-safe form validation
- **Vitest 4 + React Testing Library** — unit and component tests
- **MSW 2** — HTTP mocking
- **Playwright 1.62** — end-to-end tests
- **ESLint 9 + Prettier 3** — linting and formatting

TypeScript is pinned to the 5.9 line and ESLint to 9.x because
`eslint-config-next@16` bundles `typescript-eslint@8`, whose peer ranges are
`typescript >=4.8.4 <6.0.0` and `eslint ^8.57 || ^9`. Newer majors of either exist
but are not supported by that toolchain yet.

## Current implementation status

**Shared UI / final frontend consolidation: COMPLETED.** Module 12 preserved
the existing primitives, added narrowly scoped `TableScrollArea` and `Pagination`
primitives, and adopted them only where generic duplication was verified. All
frontend implementation modules 0-12 are now complete. Integration Phases 1,
2/2B, 3, 4, 5, 6, 7, 8, and 9 connect Foundation/Auth, Product Catalog, Inventory,
Sales, Dashboard Summary, Forecast Run/Background Jobs, Forecast Results, and
Recommendations and Reports respectively; the
remaining business integrations stay
separate phases.

**Settings: COMPLETED.** Module 11 adds protected `/settings` Forecast Defaults
and Safety Stock Defaults forms with component-tested UI state. Persistence/API
integration remains intentionally deferred.

**Reports: COMPLETED.** Module 10 adds the protected `/reports` frontend and
component-tested export architecture. Module 11 Settings is also completed.

**Foundation: COMPLETED. Auth: COMPLETED. Dashboard: COMPLETED. Products:
COMPLETED. Inventory: COMPLETED. Sales Upload: COMPLETED. Sales History:
COMPLETED. Forecast Run: COMPLETED. Forecast Results: COMPLETED. Recommendations:
COMPLETED. Reports: COMPLETED. Settings: COMPLETED. Shared UI: COMPLETED.** All
frontend implementation modules are complete. See
[`progress.md`](progress.md).

Foundation establishes shared infrastructure. Module 1 adds login, registration,
logout, protected-route UX, a test-only E2E adapter, and the real backend Auth
adapter. Module 2 adds the protected Dashboard UI, typed summary
projections, and explicit loading/empty/error states. Module 3 adds a protected
Product Catalog with backend-aligned validation, list filters, create/edit UI,
and its real shared-client adapter. Module 4 adds protected Inventory stock
monitoring, movement validation, backend-authoritative low-stock handling, and
its real shared-client adapter. Module 5 adds protected CSV file selection, backend-aligned
preflight, upload-state UX, safe batch results, and rejected-row presentation
through its real shared-client adapter. Module 7 adds a protected global Forecast
Run configuration and lifecycle-status surface with a real create/enqueue/job-poll/
run-reconcile adapter.
Module 8 adds a protected completed-run Forecast Results surface with a real
shared-client result adapter, summary, allowed metrics, prediction list,
filters, actual-versus-predicted aggregate chart, and on-demand product detail.
Auth, Dashboard, Products, Inventory, Sales, Forecast Run, Forecast Results,
Recommendations, and Reports use their approved real adapters; Settings and
ML control surfaces remain deferred.

Module 9 adds a protected, read-only Recommendations surface with backend-aligned
five-level risk labels, read-only status display, Product/SKU search, risk/status filtering, backend-shaped
offset/limit pagination, safe quantity display, and explicit safe states. Its
normal adapter is unavailable-by-default and never makes an HTTP request.

## Auth module

`src/features/auth/` owns the Auth adapter contract, provider, schemas, forms,
redirect validation, and access boundaries. Public routes are `/login` and
`/register`; `/dashboard` is the protected Dashboard route. Real backend
authentication integration is enabled through the shared client and secure
cookie-session boundary; remaining business adapters remain deferred.

### Integration Phase 1

The browser holds only an in-memory access token. The backend refresh token is an HttpOnly cookie scoped to Auth
routes, and is used only for browser refresh/logout transport. The shared client
performs one coalesced invalid-access-token recovery and one replay. Frontend
route protection remains a user-experience boundary; the FastAPI backend remains
the authorization authority. Later approved phases independently enable their
own feature adapters; they do not widen Auth state or token storage.

## Settings module

`src/features/settings/` owns the protected `/settings` route, typed Forecast
Defaults and Safety Stock Defaults projections, RHF/Zod forms, independent save
and revert UI state, and an unavailable-by-default `SettingsService`. The
read-only inspected backend contract provides 7/15/30-day forecast horizons,
1-365 history days, `random_forest`/`baseline`, auto-processing, and absolute
three-decimal safety stock. Normal builds make no Settings request, use no fake
defaults, and persist nothing locally; component fixtures are injected only by
tests. Backend connection remains intentionally deferred.

## Shared UI / final consolidation

`src/components/ui/` remains a dependency-free presentational layer: it imports
only generic utilities, never a feature, API adapter, query hook, or business
model. Module 12 found two reusable presentation concerns without redesigning
the established primitives:

- `TableScrollArea` provides responsive horizontal containment while each
  feature retains its own semantic table, columns, caption, cell formatting, and
  data contract.
- `Pagination` presents page position and previous/next intent while the owning
  feature retains its cursor/offset calculation, request state, and labels.

Feature-owned status/risk badges, upload progress, forecast lifecycle state,
charts, and form layouts remain local because their semantics are not generic.
No business API call, token storage behavior, mock production data, or backend
integration was added.

## Dashboard module

`src/features/dashboard/` owns Dashboard Analytics-facing summary types, a real
shared-client Summary adapter, state hook, and data-driven KPI, chart, alert, and
inventory-risk components. Normal builds call only `GET /api/v1/dashboard/summary`
and map the backend-authoritative rendered projection without fabricating values.
The existing UI intentionally leaves `forecast_overview` and `recent_activity`
unrendered. Playwright receives serialized fixtures only under its managed
test-mode build; the opt-in live spec disables that adapter explicitly.

## Products module

The Product Catalog feature owns Product types, service boundary, state hook,
Zod schemas, and the responsive list/create/edit UI on /products. Production
builds use an unavailable service that never calls the backend or pretends a
local write is persistent. The Playwright-managed build alone selects a
deterministic session-scoped fixture adapter for browser tests. Category
management, archive/delete, inventory, sales, and all other business modules
remain outside Module 3.

## Inventory module

`src/features/inventory/` owns safe public Inventory projections, the real
shared-client `InventoryService`, list/movement state, Zod stock-movement
schemas, and the protected `/inventory` UI. The UI models the inspected backend
semantics: stock changes are immutable movements; stock-in/out use positive
quantities, adjustment sets an absolute non-negative quantity, correction is a
non-zero signed delta, and low stock is the backend endpoint projection of active
items at or below minimum stock. The Playwright-only adapter reads isolated
session-scoped fixtures; normal builds request only the integrated Inventory
endpoints and retain no local stock persistence. Product CRUD, threshold
settings, and movement history are outside this module.

## Sales Upload module

`src/features/sales/` owns the protected `/sales/upload` route, single CSV file
selection, client preflight, explicit upload state, and safe batch-result and
rejected-row projections. Its contract is `.csv`, up to 5 MiB, with `sale_date`,
`product_sku`, and `quantity` headers. The normal service submits `FormData`
using the exact `file` field through the shared authenticated client; Playwright
alone selects a session-scoped deterministic adapter. Sales History reads the
new backend state through its separate adapter; transaction management and
Inventory updates remain outside Module 5.

## Sales History module

`src/features/sales/` also owns the protected `/sales` read-only Sales History
route. It renders a semantic historical transaction table, product/SKU search,
source and inclusive date filters, backend-aligned offset/limit pagination
infrastructure, and an accessible quantity-trend chart. The normal
`SalesHistoryService` requests the real transaction-list and trend endpoints
through the shared authenticated client; deterministic transaction/trend fixtures
remain isolated to unit and component test infrastructure. The adapter preserves
backend Decimal-compatible values and date-only calendar strings at its boundary.

## Forecast Run module

`src/features/forecasting/` owns the protected `/forecasts/runs` route, safe
Forecast Run projection, Zod/RHF horizon form, explicit UI interaction states,
and a transport-independent start/status service contract. It mirrors the
read-only backend contract: forecast runs are global, horizons are 7, 15, or 30
days, and lifecycle status is `pending`, `running`, `completed`, `failed`, or
`cancelled`. The backend exposes no percentage progress, so the UI shows status
text only and does not invent progress or forecast results. The normal adapter
makes no request; the Playwright-managed build alone selects a deterministic,
session-scoped test adapter. Real Forecast Run and ML integration remain
intentionally deferred.

## Forecast Results module

`src/features/forecasting/` also owns the protected `/forecasts/results` route.
It accepts only a validated UUID `runId` query, then composes safe completed-run
summary fields, backend-produced MAE/RMSE/MAPE metrics, offset/limit prediction
rows, product/SKU and inclusive date filters, an accessible lightweight SVG
aggregate chart, and on-demand product detail. Actual quantity is nullable and
is never converted to zero; the prediction table does not invent actual values
because they are absent from the backend list contract. Normal runtime uses the
shared authenticated client for persisted Results reads only. Playwright alone
receives isolated session-scoped result fixtures. Forecast Result generation and
the ML pipeline remain backend-owned.

## Recommendations module

`src/features/recommendations/` owns safe recommendation projections, risk/filter
schemas, the real shared-client `RecommendationsService`, abortable global and
run-scoped reads, explicit generation, run summary, on-demand detail, and
backend-confirmed acknowledge/dismiss actions. It displays backend-generated
recommendations only and never calculates reorder quantities or risk. The
Playwright-managed build alone reads a validated, session-scoped test fixture;
normal builds use the verified Recommendations HTTP contract.

## Reports module

`src/features/reports/` owns the protected `/reports` composition, the five
read-only backend report definitions, report-specific filter validation, safe
table/summary projection, and CSV export state. Its report types are model
performance, inventory risk, reorder summary, demand forecast, and sales
summary. The normal `ReportsService` uses the shared authenticated API client
for the five verified read-only Report routes and maps every report schema
independently. CSV exports call the same route with `format=csv`, receive a
Blob, validate the CSV response type, and use a safe attachment filename or a
deterministic fallback. Test-only fixtures/adapters remain explicitly selected
only by the Playwright-managed build; they are never the normal runtime.

## How modules will be structured

Each future module is a vertical slice under `src/features/<feature>/`, owning its
API functions, components, hooks, Zod schemas, and types. Routes under `src/app/`
compose features. Shared infrastructure stays in `src/lib/`, shared UI in
`src/components/`. Features never import from one another.

Details and the full rule set: [`architecture.md`](architecture.md) and
[`../src/features/README.md`](../src/features/README.md).

## How testing works

Unit tests cover `lib/`, `types/`, and feature schemas/adapter boundaries.
Component tests cover shared controls plus Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, Forecast Run, Forecast Results, Recommendations, and Reports through their
accessible surface. Playwright covers whole-application behavior in a real
browser. MSW backs every HTTP interaction in Vitest, configured to fail on
unmocked requests.

Recommendations adds schema/service unit tests, an accessible list component test,
and deterministic protected-route Playwright coverage for populated, filter,
pagination, empty, error, and mobile flows.

Details: [`testing.md`](testing.md).

## Where commands are documented

[`commands.md`](commands.md) is the reference for every script.
[`project-runner.md`](project-runner.md) walks through them in the order a
developer needs them.

## Keeping documentation current

Every future module must update, in the same change as its code:

- `README.md` — module status, and any new command or environment variable
- `docs/progress.md` — that module's row, plus notes
- `docs/testing.md` — the tests added and their scope
- `docs/commands.md` — any new or changed script
- `docs/project-runner.md` — new setup steps, env vars, or failure modes
- `project_runner.md` — quick-start and scope changes

Update the relevant sections; do not rewrite unrelated documentation.

## Integration Phase 6 - Forecast Run + Background Jobs

Forecast Run now has a real, shared-client adapter for create, enqueue, active
job polling, and terminal run reconciliation. It remains a status-only surface:
it does not show Forecast Results, progress percentages, queue internals, or an
ML control plane. The deterministic E2E adapter stays explicitly build-gated;
the live-worker browser contract is opt-in. See `architecture.md`,
`testing.md`, and `project-runner.md` for the exact lifecycle and prerequisites.

## Integration Phase 7 - Forecast Results

Forecast Results now reads the verified FastAPI overview, prediction, metrics,
chart, and product-specific result contracts through the existing authenticated
client. The browser maps response envelopes at the feature boundary and renders
only backend-persisted values. Chart failures are local to the chart surface;
metrics may be legitimately unavailable. A completed Forecast Run links to its
own Results route, while the Results route remains read-only and does not poll,
run ML, or call Recommendations. The deterministic Results adapter is selected
only for Playwright fixture builds; the live worker-backed contract is opt-in.

## Integration Phase 8 - Recommendations

Recommendations now consumes all six verified user-facing backend operations
through the existing authenticated API client: generate, global list, run list,
run summary, detail, and status update. Run-specific review is entered from the
completed Forecast Results screen with a validated `forecastRunId`; generation
always sends `{ refresh: false }`, has no automatic retry, and reconciles the
existing rows after a conflict. Recommendation status never mutates Inventory
or creates a purchase order. The real browser contract is opt-in through
`PLAYWRIGHT_RECOMMENDATIONS_REAL_BACKEND=true` and requires FastAPI,
PostgreSQL, Redis, and an RQ worker.
