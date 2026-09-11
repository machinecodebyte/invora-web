# Progress

Implementation status of the Invora frontend, module by module.

## Status

| Module           | Status                                   | Notes                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation       | **Completed**                            | Next.js 16 App Router, strict TypeScript, Tailwind 4 design tokens, typed API client, `ApiError` model, TanStack Query provider, auth infrastructure, RHF + Zod pattern, logger with redaction, security headers, error/not-found/loading routes, Vitest + RTL + MSW + Playwright harness, 262 unit/component tests, 6 E2E tests, documentation |
| Shared UI        | **In progress — foundation established** | Button, Input, Label, Card (+ Header/Title/Description/Content/Footer), Spinner, Skeleton, EmptyState, ErrorState, Toaster; AppShell, Header, MainContent, PageContainer. All typed, accessible, and tested. Extended as modules need it.                                                                                                       |
| Auth             | **Completed**                            | Login and registration routes, React Hook Form + Zod validation aligned to the backend contract, provider/action state, local logout, safe redirect handling, protected/public route boundaries, test-only E2E adapter, 26 unit/component tests, and 9 E2E tests. No real Auth API request is enabled.                                          |
| Dashboard        | **Completed**                            | Protected responsive Dashboard with backend-aligned KPI, demand-trend, reorder-alert, and inventory-risk view projections; typed no-request service boundary; loading/empty/error states; 12 unit/component tests and 6 E2E tests. Real Dashboard Analytics integration remains disabled.                                                       |
| Products         | Pending                                  | `src/features/products/` created empty                                                                                                                                                                                                                                                                                                          |
| Inventory        | Pending                                  | `src/features/inventory/` created empty                                                                                                                                                                                                                                                                                                         |
| Sales Upload     | Pending                                  | `src/features/sales/` created empty                                                                                                                                                                                                                                                                                                             |
| Sales History    | Pending                                  | `src/features/sales/` created empty                                                                                                                                                                                                                                                                                                             |
| Forecast Run     | Pending                                  | `src/features/forecasting/` created empty                                                                                                                                                                                                                                                                                                       |
| Forecast Results | Pending                                  | `src/features/forecasting/` created empty                                                                                                                                                                                                                                                                                                       |
| Recommendations  | Pending                                  | `src/features/recommendations/` created empty                                                                                                                                                                                                                                                                                                   |
| Reports          | Pending                                  | `src/features/reports/` created empty                                                                                                                                                                                                                                                                                                           |
| Settings         | Pending                                  | `src/features/settings/` created empty                                                                                                                                                                                                                                                                                                          |

Future feature directories exist as placeholders only. They contain no
implementation, stub API calls, or business data.

## Backend integration

**Not enabled.** Foundation, Auth, and Dashboard make no real backend request.
The backend (`../backend`) was inspected read-only to align Auth fields and
Dashboard Analytics summary semantics, but the frontend uses unavailable or
no-data-by-default adapters until the API integration phase. Each feature module
wires up endpoints only when that phase is enabled.

## Current verification

| Check                   | Result                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `npm run lint`          | Pass — no errors, no warnings                                                              |
| `npm run typecheck`     | Pass — no errors                                                                           |
| `npm run test`          | Pass — 26 files, 300 tests                                                                 |
| `npm run test:coverage` | Pass — 97.97% statements, 97.98% branches, 96.85% functions, 97.94% lines (85% thresholds) |
| `npm run build`         | Pass — `/`, `/dashboard`, `/login`, `/register`, and `/_not-found` compile successfully    |
| `npm run start`         | Pass — verified via the Playwright managed production server                               |
| `npm run test:e2e`      | Pass — 21 tests in Chromium against a production build                                     |

## Foundation exclusions

Deliberately not implemented, by scope:

- Future business modules Products through Settings
- Any business API call
- Any business data — no fake products, sales, inventory, forecasts,
  recommendations, reports, KPIs, or users
- Real authentication endpoints, backend session invalidation, token refresh,
  password reset, verification, MFA, or OAuth
- Real Dashboard Analytics requests or production fixture data
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
