# Progress

Implementation status of the Invora frontend, module by module.

## Status

| Module           | Status                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Foundation       | **Completed**                            | Next.js 16 App Router, strict TypeScript, Tailwind 4 design tokens, typed API client, `ApiError` model, TanStack Query provider, auth infrastructure, RHF + Zod pattern, logger with redaction, security headers, error/not-found/loading routes, Vitest + RTL + MSW + Playwright harness, 262 unit/component tests, 6 E2E tests, documentation                                                                    |
| Shared UI        | **In progress — foundation established** | Button, Input, Label, Card (+ Header/Title/Description/Content/Footer), Spinner, Skeleton, EmptyState, ErrorState, Toaster; AppShell, Header, MainContent, PageContainer. All typed, accessible, and tested. Extended as modules need it.                                                                                                                                                                          |
| Auth             | **Completed + Phase 1 integrated**       | Login/register, HttpOnly refresh-cookie session restoration, real shared-client Auth adapter, bounded 401 refresh/replay, server logout, safe redirects, protected/public route boundaries, and isolated test-only E2E adapter. Business API integration remains disabled.                                                                                                                                         |
| Dashboard        | **Completed + Phase 5 integrated**       | Protected responsive Dashboard uses one real shared-client `GET /api/v1/dashboard/summary` adapter for backend-authoritative KPIs, demand trends, Inventory risk, and reorder alerts. Decimal/date mapping, safe loading/error/no-data states, deterministic fixtures, and opt-in live-browser coverage are preserved. |
| Products         | **Completed**                            | Protected Product Catalog list with search and active-status filters; React Hook Form + Zod create/edit form; loading/empty/error/pending states; typed no-request service boundary; deterministic test-only E2E fixture adapter; 20 Product-specific unit/component tests and 7 E2E tests. Real Product Catalog API integration remains disabled.                                                                 |
| Inventory        | **Completed + Phase 3 integrated**       | Protected Inventory table with backend-aligned stock status, search/status filters, dedicated low-stock view, and immutable stock-movement form; loading/empty/error/pending states; real shared-client list, low-stock, and movement adapter; Inventory-scoped query invalidation; deterministic fixture adapter plus opt-in real-backend E2E coverage.                                                           |
| Sales Upload     | **Completed + Phase 4 integrated**       | Protected CSV upload with backend-aligned preflight and live `POST /api/v1/sales/uploads` through the shared authenticated client. The normal runtime uses browser-owned multipart boundaries and reports final server results without invented processing progress; the deterministic test-only adapter remains explicitly gated. |
| Sales History    | **Completed + Phase 4 integrated**       | Protected read-only Sales Transaction table and day trend now use live `GET /api/v1/sales/transactions` and `GET /api/v1/sales/transactions/trends` adapters, with explicit snake_case query mapping, date-only preservation, decimal boundary mapping, and independent safe states. |
| Forecast Run     | **Completed**                            | Protected `/forecasts/runs` configuration/status route; backend-aligned 7/15/30-day horizon form; explicit lifecycle UI; typed no-network start/status boundary; deterministic test-only lifecycle adapter; 10 unit/component tests and 7 E2E tests. Real Forecast Run and ML integration remain disabled.                                                                                                         |
| Forecast Results | **Completed**                            | Protected `/forecasts/results` completed-run route; validated UUID selection; backend-aligned summary, MAE/RMSE/MAPE, product/SKU and date filters, offset/limit prediction list, nullable-actual SVG comparison, and explicit safe states; typed no-network boundary; deterministic test-only fixture adapter; 14 unit/component tests and 9 E2E tests. Real Forecast Results and ML integration remain disabled. |
| Recommendations  | **Completed**                            | Protected read-only `/recommendations` route; backend-aligned five-level risk and read-only status labels, Product/SKU search, risk/status filters, offset/limit pagination, three-decimal-safe reorder display, and explicit safe states; typed no-network boundary; deterministic test-only fixture adapter; 10 unit/component tests and 9 E2E tests. Real Recommendations integration remains disabled.         |
| Reports          | **Completed**                            | Protected read-only `/reports` route with the five inspected backend report types, report-specific filters, semantic tables, backend-provided summary projection, CSV-only export state, and deterministic component fixtures. Normal runtime makes no Report or export request and creates no file/download.                                                                                                      |
| Settings         | **Completed**                            | Protected `/settings` route with backend-aligned Forecast Defaults and absolute three-decimal Safety Stock Defaults; RHF + Zod validation; independent dirty/save/revert states; safe loading/error UI; test-only component fixtures; no runtime persistence or request.                                                                                                                                           |

| Shared UI — final consolidation | **Completed** | Module 12 preserves the canonical primitives and adds `TableScrollArea` for generic responsive table containment plus `Pagination` for generic accessible previous/next presentation. Table semantics, query math, badges, upload progress, charts, and form state remain feature-owned. |

Remaining future feature directories contain no implementation, stub API calls,
or business data.

**All frontend implementation modules 0-12 are complete. Frontend-to-backend
API integration remains the next separate phase.**

Shared UI was incrementally extended for Module 3 with typed, tested Select,
Textarea, and accessible Dialog primitives. Existing Foundation primitives and
layout components were preserved. Modules 4 and 5 reuse the shared UI surface;
Module 5 uses a native semantic `<progress>` within its feature because no broader
reusable progress primitive was required. Module 6 reuses the existing semantic
table, filter controls, skeleton, state components, and Dashboard's lightweight
SVG chart approach without expanding shared UI unnecessarily.
Module 7 reuses the existing protected-route, layout, Card, Button, Label, and
Select primitives without adding a shared progress control: the inspected
Forecast Run backend exposes lifecycle status but no percentage progress.
Module 8 reuses the same shared layout, Card, Button, Input, Label, Skeleton,
EmptyState, and ErrorState primitives. Its accessible SVG comparison remains
feature-local because it represents a Forecast Results-specific contract.
Module 9 reuses the same protected route, layout, Input, Select, Button,
Skeleton, EmptyState, and ErrorState primitives. Its risk badge, quantity display,
and semantic table remain feature-local because they represent the backend-owned
Recommendation contract.

Module 10 reuses the same protected route, layout, Input, Select, Button, Card,
Skeleton, EmptyState, and ErrorState primitives. Its report-specific table,
summary, filters, and CSV export state remain feature-local because they map the
Reports contract and do not create a new shared business abstraction.

Module 11 reuses the same protected route, layout, Card, Input, Label, Select,
Button, Skeleton, and ErrorState primitives. Its native checkbox remains
feature-local because no existing shared checkbox primitive was required. Forecast
and safety-stock form state stays in the Settings slice, with no provider or
cross-feature business import added.

Module 12 completed the shared presentation audit without redesigning or
rewriting earlier work. Six feature tables adopt `TableScrollArea`; Sales
History, Forecast Results, and Recommendations adopt `Pagination`. The
consolidation explicitly leaves feature-specific badges, native upload progress,
forecast lifecycle presentation, charts, and form layouts in their owning
features. Three focused component tests cover the two primitives, while existing
feature and browser tests protect the business behavior they compose around.

## Backend integration

**Auth, Dashboard, Products, Inventory, Sales Upload, and Sales History are enabled.** Foundation transport and Auth use
the real backend contract. Products use the shared authenticated client for their
approved Phase 2/2B endpoints. Inventory uses it for item listing, the dedicated
low-stock projection, and immutable movements. Sales uses it for multipart CSV
upload, read-only transaction history, and backend-owned trends. Dashboard uses
the single Summary endpoint for its existing read-only projection. Forecast Run,
Forecast Results, Recommendations, Reports, and Settings make no real backend
request.
The backend (`../backend`) was inspected read-only to align Auth fields,
Dashboard Analytics summary semantics, Product Catalog validation/list semantics,
and Inventory movement/low-stock semantics, Sales Upload CSV rules, Sales Transaction list/trend semantics, Forecast Run horizon/lifecycle semantics, Forecast Results overview/list/metrics/chart semantics, Recommendations risk/list/quantity semantics, and Reports views/export semantics, but the frontend uses unavailable or
no-data-by-default adapters until the API integration phase. Each feature module
wires up endpoints only when that phase is enabled.

Module 12 adds presentation reuse only; it does not make a backend request or
alter any existing service boundary.

Read-only Settings inspection found a user-scoped persisted contract. Forecast
defaults support 7/15/30 days, a 1-365-day history window, `random_forest` or
`baseline`, and auto-processing. Inventory safety stock is an absolute Decimal
from 0 through `99999999999.999` with up to three decimal places. The frontend
aligns its types and validation but does not call these existing endpoints yet.

## Current verification

| Check                   | Result                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `npm run lint`          | Pass — no errors, no warnings                                                              |
| `npm run typecheck`     | Pass — no errors                                                                           |
| `npm run test`          | Historical Module 11 baseline — 54 files, 413 tests                                        |
| `npm run test:coverage` | Pass — 94.46% statements, 92.95% branches, 94.89% functions, 94.38% lines (85% thresholds) |
| `npm run build`         | Pass — all completed routes, including `/settings`, compile successfully                   |
| `npm run start`         | Pass — verified via the Playwright managed production server                               |
| `npm run test:e2e`      | Pass — 76 tests in Chromium against a production build                                     |

## Module 12 verification

| Check                   | Result                                                                    |
| ----------------------- | ------------------------------------------------------------------------- |
| `npm run lint`          | Pass — no errors or warnings                                              |
| `npm run typecheck`     | Pass — strict TypeScript with no errors                                   |
| `npm run test`          | Pass — 55 files, 416 tests                                                |
| `npm run test:coverage` | Pass — 94.48% statements, 92.95% branches, 94.96% functions, 94.40% lines |
| `npm run build`         | Pass — all routes compile successfully                                    |
| `npm run start`         | Pass — all implemented routes return HTTP 200 on the production server    |
| `npm run test:e2e`      | Pass — 76 Chromium tests against a production build                       |

The earlier verification table records the Module 11 baseline. The Module 12
table above records the final consolidated frontend suite.

## Integration Phase 3 verification

| Check                                   | Result                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm run lint`                          | Pass — no lint errors                                                                           |
| `npm run typecheck`                     | Pass — strict TypeScript with no errors                                                         |
| full Vitest suite                       | Pass — 439 tests                                                                                |
| `npm run test:coverage`                 | Pass — 439 tests; configured 85% thresholds enforced                                            |
| deterministic Inventory Chromium E2E    | Pass — 12 scenarios                                                                             |
| opt-in real Inventory Chromium contract | Pass — list, dedicated low-stock, successful movement/refetch, and insufficient-stock rejection |
| normal-runtime production build         | Pass                                                                                            |

The real contract used a temporary isolated backend instance and uniquely named
test records. It did not modify backend source or use production credentials.

## Integration Phase 4 verification

| Check                                      | Result                                                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Sales adapter, schema, MSW, component tests | Pass — 31 focused tests                                                                        |
| full Vitest coverage suite                 | Pass — 56 files, 447 tests; 94.41% statements, 93.28% branches, 95.94% functions, 94.33% lines |
| deterministic Sales Upload Chromium E2E    | Pass — 11 fixture-only scenarios                                                               |
| opt-in real Sales Chromium contract        | Pass — real Auth, CSV upload, History reconciliation, daily trend, and no Inventory request    |
| full deterministic Chromium regression     | Pass — 78 tests; 3 opt-in live specs skipped                                                   |
| backend Sales contract regression          | Pass — 25 focused Sales Upload/Transaction tests                                                |
| frontend lint/typecheck/normal build       | Pass                                                                                           |

Phase 4 replaces only normal-runtime Sales Upload and Sales History placeholders.
The upload adapter uses the shared authenticated client with browser-generated
multipart `FormData` (`file` field); the list/trend adapter maps backend wire
data, Decimal-compatible values, pagination, and date-only values at the Sales
boundary. No Product or Inventory cache/service is mutated after upload. The real
browser contract used a temporary local backend and unique controlled user/Product
data; no backend source or production credential was changed.

## Integration Phase 5 verification

| Check | Result |
| --- | --- |
| Dashboard adapter, mapper, MSW, and component tests | Pass — 19 focused tests |
| deterministic Dashboard Chromium E2E | Pass — 6 fixture-only scenarios |
| opt-in real Dashboard Chromium contract | Pass — real Auth, Summary, KPI, demand, Inventory-risk, and no-data reorder-alert rendering |
| backend Dashboard API/unit regression | Pass — 14 focused tests |

Phase 5 replaces only the normal Dashboard unavailable adapter with a real
authenticated Summary adapter. The existing Module 2 UI renders `kpis`,
`demand_trends`, `inventory_risk`, and `reorder_alerts`; backend
`forecast_overview` and `recent_activity` remain intentionally unrendered.
The Dashboard has no current filter controls, so the adapter sends no dates or
forecast id and preserves the backend default 30-day range. No Product,
Inventory, or Sales source/cache behavior changed because Dashboard retains its
existing local mount/reload fetch pattern rather than a cached query.

## Foundation exclusions

Deliberately not implemented, by scope:

- Any business API call outside the integrated Product Catalog, Inventory, Sales, and Dashboard scope
- Any production business data — no fake products, sales, inventory, forecasts,
  recommendations, reports, KPIs, or users
- Password reset, verification, MFA, OAuth, or any Auth feature beyond the
  implemented login/register/refresh/logout contract
- Real Forecast Run, Forecast Results, Recommendations, Reports, Settings, or ML requests, or production fixture data
- Content-Security-Policy (requires per-request nonce plumbing; see
  [`architecture.md`](architecture.md))
- External observability platform

## Documentation update requirement

Every future module must update, in the same change as its code:

- `README.md` — module status, new commands, new environment variables
- `docs/progress.md` — that module's row and notes
- `docs/testing.md` — tests added and their scope
- `docs/commands.md` — new or changed scripts
- `docs/project-runner.md` — new setup steps, env vars, failure modes
- `project_runner.md` — quick-start and scope changes

Update the relevant sections incrementally. Do not overwrite unrelated
documentation, and do not mark a module completed before it is verified.
