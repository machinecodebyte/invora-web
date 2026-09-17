# Invora Frontend

**Predict · Optimize · Replenish**

Frontend for Invora, an AI-based demand forecasting and inventory reorder
recommendation system for small-business inventory management.

## Current status

**Frontend Module 12 - Shared UI / final frontend consolidation: COMPLETED.**
All frontend implementation modules 0-12 are complete. Frontend-to-backend API
integration remains the next separate phase.

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
protected CSV selection and preflight experience with upload progress, safe result
summaries, and rejected-row feedback. Normal builds make no Sales Upload request
or persistent local write. Module 6 adds a protected read-only Sales History table,
backend-aligned product/SKU search, source and inclusive date filters, offset/limit
pagination infrastructure, and a quantity-trend chart. Normal builds make no Sales
Transaction request and do not contain sales records. Module 7 adds a protected
Forecast Run form with backend-aligned 7-, 15-, and 30-day horizons, explicit
pending/running/completed/failed lifecycle presentation, and manual status refresh.
Normal builds make no Forecast Run or ML request and do not contain forecast data.
Module 8 adds a protected completed-run results route with backend-aligned summary,
MAE/RMSE/MAPE, paginated prediction rows, and an accessible actual-versus-predicted
chart that preserves missing actual observations. Normal builds make no Forecast
Results, backend, or ML request and contain no forecast result data.

Module 9 adds a protected, read-only Recommendations route with backend-aligned
five-level risk presentation, read-only status display, Product/SKU search, risk/status filtering, offset/limit
pagination, reorder quantities that retain valid zeroes and up to three decimal
places, and safe loading, empty, filtered-empty, and error states. Normal builds
make no Reorder Recommendation request and contain no recommendation data.

Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, Forecast Run, Forecast Results, and Recommendations use adapter boundaries and
are **not** connected to the backend API yet. In normal builds Dashboard,
Products, Inventory, Sales Upload, Sales History, Forecast Run, and Forecast Results remain honest; test fixtures are isolated to component and Playwright
infrastructure. See
[`docs/progress.md`](docs/progress.md) for per-module status.

Recommendations follows the same no-network adapter boundary. Its deterministic
session-scoped fixtures are selected only by the Playwright-managed test build.

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
pagination controls. The complete frontend suite now contains 416
unit/component tests plus 76 Playwright tests.

416 unit and component tests plus 76 Playwright tests cover the Foundation, Auth,
Dashboard, Products, Inventory, Sales Upload, Sales History, Forecast Run, Forecast Results, Recommendations, Reports, and Settings modules. Configured coverage exceeds the required 85%
threshold for every measured metric.

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
horizon/lifecycle semantics were aligned through read-only inspection, but no frontend Auth,
Dashboard, Products, Inventory, Sales Upload, Sales Transaction, Forecast Run, or Forecast Results request is made at runtime. API integration
lands in a later integration phase. See
[`docs/architecture.md`](docs/architecture.md) for the integration plan.

Recommendations risk levels, list filters, response-safe fields, nullable reason,
and three-decimal quantity semantics were also aligned through read-only backend
inspection. The frontend does not call the Recommendations API at runtime.

Reports contract inspection established model-performance, inventory-risk,
reorder-summary, demand-forecast, and sales-summary views. The backend exposes
synchronous `text/csv` attachments as its sole export format. The frontend does
not call Reports or export endpoints at runtime.
