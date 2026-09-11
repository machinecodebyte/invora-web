# Invora Frontend Project Runner

Quick start for running the Invora frontend locally. For the long-form version
(including CI notes and extended troubleshooting) see
[`docs/project-runner.md`](docs/project-runner.md).

## Prerequisites

- **Node.js >= 20.9.0** (developed and verified on 24.14.0) — `node --version`
- **npm** (ships with Node; verified on 11.9.0) — `npm --version`
- Git
- A Chromium download for Playwright (one-time, see [E2E Testing](#e2e-testing))

No database, Redis, or backend service is required: the Foundation module makes
no API calls.

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
npm run test              # unit + component (300 tests)
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
- Accessible UI primitives: Button, Input, Label, Card, Spinner, Skeleton,
  EmptyState, ErrorState, Toaster
- Layout primitives: AppShell, Header, MainContent, PageContainer
- Typed API client: timeouts, cancellation, envelope unwrapping, normalized errors
- `ApiError` model with status, code, validation details, and correlation id
- TanStack Query client with dashboard-appropriate defaults
- Auth infrastructure (in-memory session store, no endpoints, no network calls)
- React Hook Form + Zod validation pattern with API-error mapping
- Logging abstraction with credential redaction
- Vitest, React Testing Library, MSW, and Playwright harness

**Deliberately not implemented:** Products, Inventory, Sales Upload, Sales
History, Forecast Run, Forecast Results, Recommendations, Reports, and Settings
modules; any business API call; any business data, real or dummy.

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

**Real backend Auth integration is intentionally not enabled.** The normal
adapter makes no HTTP request and cannot authenticate a production user. The
Playwright-only adapter is selected only for the managed E2E build and persists
only a test email, never a token.

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
