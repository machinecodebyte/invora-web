# Progress

Implementation status of the Invora frontend, module by module.

## Status

| Module           | Status                                   | Notes                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation       | **Completed**                            | Next.js 16 App Router, strict TypeScript, Tailwind 4 design tokens, typed API client, `ApiError` model, TanStack Query provider, auth infrastructure, RHF + Zod pattern, logger with redaction, security headers, error/not-found/loading routes, Vitest + RTL + MSW + Playwright harness, 262 unit/component tests, 6 E2E tests, documentation                       |
| Shared UI        | **In progress — foundation established** | Button, Input, Label, Card (+ Header/Title/Description/Content/Footer), Spinner, Skeleton, EmptyState, ErrorState, Toaster; AppShell, Header, MainContent, PageContainer. All typed, accessible, and tested. Extended as modules need it.                                                                                                                             |
| Auth             | **Completed**                            | Login and registration routes, React Hook Form + Zod validation aligned to the backend contract, provider/action state, local logout, safe redirect handling, protected/public route boundaries, test-only E2E adapter, 26 unit/component tests, and 9 E2E tests. No real Auth API request is enabled.                                                                |
| Dashboard        | **Completed**                            | Protected responsive Dashboard with backend-aligned KPI, demand-trend, reorder-alert, and inventory-risk view projections; typed no-request service boundary; loading/empty/error states; 12 unit/component tests and 6 E2E tests. Real Dashboard Analytics integration remains disabled.                                                                             |
| Products         | **Completed**                            | Protected Product Catalog list with search and active-status filters; React Hook Form + Zod create/edit form; loading/empty/error/pending states; typed no-request service boundary; deterministic test-only E2E fixture adapter; 20 Product-specific unit/component tests and 7 E2E tests. Real Product Catalog API integration remains disabled.                    |
| Inventory        | **Completed**                            | Protected Inventory table with backend-aligned stock status, search/status filters, dedicated low-stock view, and immutable stock-movement form; loading/empty/error/pending states; typed no-request service boundary; deterministic test-only fixture adapter; 14 Inventory unit/component tests and 12 E2E tests. Real Inventory API integration remains disabled. |
| Sales Upload     | **Completed**                            | Protected single-CSV selection, backend-aligned preflight (`.csv`, 5 MiB, MIME, normalized required headers), explicit upload state, semantic progress, safe summary/rejected rows, no-network service boundary, test-only E2E adapter, 11 unit/component tests, and 11 E2E tests. Real Sales Upload integration remains disabled.                                    |
| Sales History    | **Completed**                            | Protected read-only Sales Transaction table with Product/SKU search, source and inclusive date filters, offset/limit pagination infrastructure, an accessible quantity trend, independent loading/empty/filtered-empty/error states, an honest no-network service boundary, and 12 unit/component tests. Real Sales Transaction API integration remains disabled.     |
| Forecast Run     | **Completed**                            | Protected `/forecasts/runs` configuration/status route; backend-aligned 7/15/30-day horizon form; explicit lifecycle UI; typed no-network start/status boundary; deterministic test-only lifecycle adapter; 10 unit/component tests and 7 E2E tests. Real Forecast Run and ML integration remain disabled.                                                            |
| Forecast Results | Pending                                  | Shares `src/features/forecasting/`; no result UI or projection has been implemented                                                                                                                                                                                                                                                                                   |
| Recommendations  | Pending                                  | `src/features/recommendations/` created empty                                                                                                                                                                                                                                                                                                                         |
| Reports          | Pending                                  | `src/features/reports/` created empty                                                                                                                                                                                                                                                                                                                                 |
| Settings         | Pending                                  | `src/features/settings/` created empty                                                                                                                                                                                                                                                                                                                                |

Remaining future feature directories, and the unimplemented Forecast Results
scope within `features/forecasting/`, contain no implementation, stub API calls,
or business data.

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

## Backend integration

**Not enabled.** Foundation, Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, and Forecast Run make no real backend
request.
The backend (`../backend`) was inspected read-only to align Auth fields,
Dashboard Analytics summary semantics, Product Catalog validation/list semantics,
and Inventory movement/low-stock semantics, Sales Upload CSV rules, Sales Transaction list/trend semantics, and Forecast Run horizon/lifecycle semantics, but the frontend uses unavailable or
no-data-by-default adapters until the API integration phase. Each feature module
wires up endpoints only when that phase is enabled.

## Current verification

| Check                   | Result                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`          | Pass — no errors, no warnings                                                                                                                                    |
| `npm run typecheck`     | Pass — no errors                                                                                                                                                 |
| `npm run test`          | Pass — 42 files, 367 tests                                                                                                                                       |
| `npm run test:coverage` | Pass — 94.46% statements, 92.95% branches, 94.89% functions, 94.38% lines (85% thresholds)                                                                       |
| `npm run build`         | Pass — `/`, `/dashboard`, `/forecasts/runs`, `/inventory`, `/products`, `/sales`, `/sales/upload`, `/login`, `/register`, and `/_not-found` compile successfully |
| `npm run start`         | Pass — verified via the Playwright managed production server                                                                                                     |
| `npm run test:e2e`      | Pass — 58 tests in Chromium against a production build                                                                                                           |

## Foundation exclusions

Deliberately not implemented, by scope:

- Future business modules Forecast Results through Settings
- Any business API call
- Any production business data — no fake products, sales, inventory, forecasts,
  recommendations, reports, KPIs, or users
- Real authentication endpoints, backend session invalidation, token refresh,
  password reset, verification, MFA, or OAuth
- Real Dashboard Analytics, Product Catalog, Inventory, Sales Upload, Sales Transaction, Forecast Run, or ML requests, or production fixture data
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
