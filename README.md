# Invora Frontend

**Predict · Optimize · Replenish**

Frontend for Invora, an AI-based demand forecasting and inventory reorder
recommendation system for small-business inventory management.

## Current status

**Frontend Module 0 — Foundation: COMPLETED.**
**Frontend Module 1 — Auth: COMPLETED.**
**Frontend Module 2 — Dashboard: COMPLETED.**
**Frontend Module 3 — Products: COMPLETED.**

**Frontend Module 4 — Inventory: COMPLETED.**

**Frontend Module 5 — Sales Upload: COMPLETED.**

The frontend currently contains Foundation, Auth, Dashboard, Products, Inventory, and Sales Upload: the application
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
or persistent local write.

Auth, Dashboard, Products, Inventory, and Sales Upload use adapter boundaries and
are **not** connected to the backend API yet. In normal builds Dashboard,
Products, Inventory, and Sales Upload remain honest; test fixtures are isolated to component and Playwright
infrastructure. See
[`docs/progress.md`](docs/progress.md) for per-module status.

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
    ui/         Button, Input, Label, Select, Textarea, Dialog, Card, Spinner, Skeleton, EmptyState, ErrorState, Toaster
  features/     Auth, Dashboard, Products, Inventory, and Sales vertical slices plus future-module placeholders
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

345 unit and component tests plus 51 Playwright tests cover the Foundation, Auth,
Dashboard, Products, Inventory, and Sales Upload modules. Configured coverage exceeds the required 85%
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
validation/list semantics, Inventory movement/low-stock semantics, and Sales Upload
CSV requirements were aligned through read-only inspection, but no frontend Auth,
Dashboard, Products, Inventory, or Sales Upload request is made at runtime. API integration
lands in a later integration phase. See
[`docs/architecture.md`](docs/architecture.md) for the integration plan.
