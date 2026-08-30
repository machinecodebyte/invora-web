# Progress

Implementation status of the Invora frontend, module by module.

## Status

| Module           | Status                                   | Notes                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation       | **Completed**                            | Next.js 16 App Router, strict TypeScript, Tailwind 4 design tokens, typed API client, `ApiError` model, TanStack Query provider, auth infrastructure, RHF + Zod pattern, logger with redaction, security headers, error/not-found/loading routes, Vitest + RTL + MSW + Playwright harness, 262 unit/component tests, 6 E2E tests, documentation |
| Shared UI        | **In progress — foundation established** | Button, Input, Label, Card (+ Header/Title/Description/Content/Footer), Spinner, Skeleton, EmptyState, ErrorState, Toaster; AppShell, Header, MainContent, PageContainer. All typed, accessible, and tested. Extended as modules need it.                                                                                                       |
| Auth             | Pending                                  | `src/features/auth/` created empty. Infrastructure ready in `lib/auth.ts` and `hooks/use-auth.ts`; no endpoints, no UI.                                                                                                                                                                                                                         |
| Dashboard        | Pending                                  | `src/features/dashboard/` created empty                                                                                                                                                                                                                                                                                                         |
| Products         | Pending                                  | `src/features/products/` created empty                                                                                                                                                                                                                                                                                                          |
| Inventory        | Pending                                  | `src/features/inventory/` created empty                                                                                                                                                                                                                                                                                                         |
| Sales Upload     | Pending                                  | `src/features/sales/` created empty                                                                                                                                                                                                                                                                                                             |
| Sales History    | Pending                                  | `src/features/sales/` created empty                                                                                                                                                                                                                                                                                                             |
| Forecast Run     | Pending                                  | `src/features/forecasting/` created empty                                                                                                                                                                                                                                                                                                       |
| Forecast Results | Pending                                  | `src/features/forecasting/` created empty                                                                                                                                                                                                                                                                                                       |
| Recommendations  | Pending                                  | `src/features/recommendations/` created empty                                                                                                                                                                                                                                                                                                   |
| Reports          | Pending                                  | `src/features/reports/` created empty                                                                                                                                                                                                                                                                                                           |
| Settings         | Pending                                  | `src/features/settings/` created empty                                                                                                                                                                                                                                                                                                          |

Feature directories exist as placeholders only. They contain no implementation, no
stub API calls, and no business data.

## Backend integration

**Not enabled.** The Foundation module makes no API calls. The backend
(`../backend`) is complete, and the frontend API client is built and tested
against its response contract, but no business endpoint is called yet. Each
feature module wires up its own endpoints as it is implemented.

## Verification at Foundation completion

| Check                   | Result                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `npm run lint`          | Pass — no errors, no warnings                                                              |
| `npm run typecheck`     | Pass — no errors                                                                           |
| `npm run test`          | Pass — 19 files, 262 tests                                                                 |
| `npm run test:coverage` | Pass — 97.97% statements, 97.97% branches, 96.85% functions, 97.94% lines (85% thresholds) |
| `npm run build`         | Pass — `/` and `/_not-found` prerendered as static content                                 |
| `npm run start`         | Pass — verified via the Playwright managed production server                               |
| `npm run test:e2e`      | Pass — 6 tests in Chromium against a production build                                      |

## Foundation exclusions

Deliberately not implemented, by scope:

- Any business module (Auth through Settings)
- Any business API call
- Any business data — no fake products, sales, inventory, forecasts,
  recommendations, reports, KPIs, or users
- Authentication endpoints, login/registration UI, password reset, refresh-token
  flow
- Dashboard navigation and authenticated chrome
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
