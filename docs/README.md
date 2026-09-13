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

**Foundation: COMPLETED. Auth: COMPLETED. Dashboard: COMPLETED. Products:
COMPLETED. Inventory: COMPLETED. Sales Upload: COMPLETED.** All remaining
business modules are **PENDING**. See [`progress.md`](progress.md).

Foundation establishes shared infrastructure. Module 1 adds login, registration,
local logout, protected-route UX, and a test-only E2E adapter. No real backend
Auth request is enabled. Module 2 adds the protected Dashboard UI, typed summary
projections, and explicit loading/empty/error states. Module 3 adds a protected
Product Catalog with backend-aligned validation, list filters, create/edit UI,
and a no-network service boundary. Module 4 adds protected Inventory stock
monitoring, movement validation, and low-stock handling through a no-network
service boundary. Module 5 adds protected CSV file selection, backend-aligned
preflight, upload-state UX, safe batch results, and rejected-row presentation
through a no-network service boundary. No real Dashboard Analytics, Product Catalog, Inventory, Sales Upload, or
other business-module API call is enabled.

## Auth module

`src/features/auth/` owns the Auth adapter contract, provider, schemas, forms,
redirect validation, and access boundaries. Public routes are `/login` and
`/register`; `/dashboard` is the protected Dashboard route. Real backend
authentication integration remains intentionally deferred.

## Dashboard module

`src/features/dashboard/` owns Dashboard Analytics-facing summary types, the
unavailable-by-default service contract, state hook, and data-driven KPI, chart,
alert, and inventory-risk components. The normal application never creates fake
business values or makes a Dashboard API request. Playwright receives serialized
test fixtures only under its managed test-mode build.

## Products module

The Product Catalog feature owns Product types, service boundary, state hook,
Zod schemas, and the responsive list/create/edit UI on /products. Production
builds use an unavailable service that never calls the backend or pretends a
local write is persistent. The Playwright-managed build alone selects a
deterministic session-scoped fixture adapter for browser tests. Category
management, archive/delete, inventory, sales, and all other business modules
remain outside Module 3.

## Inventory module

`src/features/inventory/` owns safe public Inventory projections, the
unavailable-by-default `InventoryService`, list/movement state, Zod stock-movement
schemas, and the protected `/inventory` UI. The UI models the inspected backend
semantics: stock changes are immutable movements; stock-in/out use positive
quantities, adjustment sets an absolute non-negative quantity, correction is a
non-zero signed delta, and low stock is the backend endpoint projection of active
items at or below minimum stock. The Playwright-only adapter reads isolated
session-scoped fixtures; normal builds contain no inventory records and make no
request. Product CRUD, threshold settings, and movement history are outside this
module.

## Sales Upload module

`src/features/sales/` owns the protected `/sales/upload` route, single CSV file
selection, client preflight, explicit upload state, and safe batch-result and
rejected-row projections. Its inspected contract is `.csv`, up to 5 MiB, with
`sale_date`, `product_sku`, and `quantity` headers. The normal service never sends
the file; Playwright alone selects a session-scoped deterministic adapter. Sales
History, transaction management, and Inventory updates remain outside Module 5.

## How modules will be structured

Each future module is a vertical slice under `src/features/<feature>/`, owning its
API functions, components, hooks, Zod schemas, and types. Routes under `src/app/`
compose features. Shared infrastructure stays in `src/lib/`, shared UI in
`src/components/`. Features never import from one another.

Details and the full rule set: [`architecture.md`](architecture.md) and
[`../src/features/README.md`](../src/features/README.md).

## How testing works

Unit tests cover `lib/`, `types/`, and feature schemas/adapter boundaries.
Component tests cover shared controls plus Auth, Dashboard, Products, Inventory, and Sales Upload through their
accessible surface. Playwright covers whole-application behavior in a real
browser. MSW backs every HTTP interaction in Vitest, configured to fail on
unmocked requests.

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
