# Invora Frontend

**Predict · Optimize · Replenish**

Frontend for Invora, an AI-based demand forecasting and inventory reorder
recommendation system for small-business inventory management.

## Current status

**Frontend Module 0 — Foundation: COMPLETED.**

This repository currently contains the frontend foundation only: application
shell, design tokens, shared UI primitives, API client, TanStack Query setup,
auth infrastructure, form validation plumbing, and the full test harness.

No business module is implemented yet, and the frontend is **not** connected to
the backend API. See [`docs/progress.md`](docs/progress.md) for per-module status.

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
    ui/         Button, Input, Label, Card, Spinner, Skeleton, EmptyState, ErrorState, Toaster
  features/     One directory per business module (created empty by Foundation)
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

262 unit and component tests plus a Playwright smoke suite. Coverage of the
foundation source exceeds the required 85% threshold for every measured metric.

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
complete. This module deliberately does not call it: API integration lands with
each business module. See [`docs/architecture.md`](docs/architecture.md) for the
integration plan.
