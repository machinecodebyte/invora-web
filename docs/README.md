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

**Foundation: COMPLETED.** All other modules: **PENDING**. See
[`progress.md`](progress.md).

The foundation establishes infrastructure only. It contains no business logic, no
business API calls, and no business data — real or simulated.

## How modules will be structured

Each future module is a vertical slice under `src/features/<feature>/`, owning its
API functions, components, hooks, Zod schemas, and types. Routes under `src/app/`
compose features. Shared infrastructure stays in `src/lib/`, shared UI in
`src/components/`. Features never import from one another.

Details and the full rule set: [`architecture.md`](architecture.md) and
[`../src/features/README.md`](../src/features/README.md).

## How testing works

Unit tests cover `lib/` and `types/` logic. Component tests cover
`components/` and `hooks/` through their accessible surface. Playwright covers
whole-application behavior in a real browser. MSW backs every HTTP interaction in
Vitest, configured to fail on unmocked requests.

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
