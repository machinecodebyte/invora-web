# Frontend Architecture

## Scope of this document

How the Invora frontend is organized, why, and how modules plug in. Foundation
establishes the architecture; Auth, Dashboard, Products, Inventory, Sales Upload,
Sales History, Forecast Run, Forecast Results, Recommendations, Reports, and
Settings extend it without changing its shared boundaries. Module 12 completes
the shared-UI audit without changing feature ownership or integration boundaries.

## Next.js App Router

Routes live in `src/app/` using the App Router.

```text
src/app/
  layout.tsx        Root layout: document shell, metadata, viewport, providers
  providers.tsx     Client provider composition (TanStack Query, Auth)
  page.tsx          Root page (Foundation status only)
  products/page.tsx Protected Product Catalog route (Module 3)
  inventory/page.tsx Protected Inventory route (Module 4)
  forecasts/runs/page.tsx Protected Forecast Run route (Module 7)
  forecasts/results/page.tsx Protected Forecast Results route (Module 8)
  recommendations/page.tsx Protected Recommendations route (Module 9)
  reports/page.tsx     Protected Reports route (Module 10)
  settings/page.tsx    Protected Settings route (Module 11)
  sales/page.tsx     Protected Sales History route (Module 6)
  sales/upload/page.tsx Protected Sales Upload route (Module 5)
  loading.tsx       Route-level streaming fallback
  error.tsx         Route-level error boundary
  global-error.tsx  Boundary for failures in the root layout itself
  not-found.tsx     404 route
  globals.css       Tailwind import and design tokens
```

### Layout vs. shell

The root layout owns only the document shell and global providers. Visual chrome
lives in `AppShell`, which **pages** compose. This matters for the Auth module:
sign-in screens can render without the application header by simply not using
`AppShell`, with no route-group gymnastics or conditional rendering in the layout.

### Server / client component strategy

Server Components are the default. `'use client'` is added only where a component
needs interactivity, browser APIs, or a store subscription:

| Client component                          | Why                                  |
| ----------------------------------------- | ------------------------------------ |
| `app/providers.tsx`                       | Holds the QueryClient in React state |
| `app/error.tsx`, `app/global-error.tsx`   | Error boundaries are client-only     |
| `components/ui/toaster.tsx`               | Subscribes to the toast store        |
| `hooks/use-auth.ts`, `hooks/use-toast.ts` | `useSyncExternalStore`               |

The UI primitives (`Button`, `Input`, `Card`, …) are **not** marked `'use client'`.
They carry no state or effects, so they render on the server and become client
components only when imported into one. This keeps the client bundle minimal.

Guidance for future modules: fetch on the server where the data is static per
request; use TanStack Query in client components for interactive, refetching, or
mutation-driven surfaces.

## Directory layout

```text
src/
  app/          Route composition only - no business logic
  components/
    layout/     Structural primitives: AppShell, Header, MainContent, PageContainer
    ui/         Presentational primitives, no data fetching, no business rules
  features/     One vertical slice per business module
  hooks/        Cross-feature hooks
  lib/          Framework-agnostic infrastructure
  types/        Generic transport and utility types
  tests/        Unit tests, component tests, MSW mocks, setup
e2e/            Playwright specs
```

### components vs. features vs. lib vs. hooks vs. types

| Location            | Holds                                                       | Must not hold                                          |
| ------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| `components/ui`     | Reusable presentational primitives                          | API calls, business rules, business copy               |
| `components/layout` | Page structure and landmarks                                | Feature-specific navigation                            |
| `features/*`        | A module's API functions, components, hooks, schemas, types | Imports from another feature                           |
| `lib`               | Transport, config, auth, logging, generic helpers           | Business logic, React-specific code (except providers) |
| `hooks`             | Hooks used by more than one feature                         | Feature-specific data fetching                         |
| `types`             | Transport contracts and generic type utilities              | Business models                                        |

Business models (`Product`, `InventoryItem`, `Forecast`, `Recommendation`,
`Report`) belong to the owning feature, never to `src/types`.

`src/lib/utils.ts` is deliberately small — class merging, display formatting, and
URL joining. Domain helpers go in their feature. Anything cross-cutting but
non-trivial gets its own `lib/` module (`api-client.ts`, `logger.ts`, `forms.ts`)
rather than accreting into a god-utility file.

### Feature slice shape

```text
features/<feature>/
  api/         Request functions built on the shared api client, plus query keys
  components/  Feature UI composed from components/ui
  hooks/       TanStack Query hooks and feature state
  schemas/     Zod schemas and inferred form types
  types/       Feature-owned models
```

Rules:

- A feature may import from `@/components`, `@/hooks`, `@/lib`, `@/types`.
- A feature must **not** import from another feature. Promote genuinely shared
  code upward instead of reaching sideways.
- Routes compose features; they contain no business logic.

## Path aliases

A single alias, `@/*` → `src/*`, is configured in `tsconfig.json` and mirrored in
`vitest.config.ts`. One alias keeps imports predictable and avoids the drift that
comes with per-directory aliases.

## API client architecture

`src/lib/api-client.ts` owns transport concerns only:

- **Environment-driven base URL** — resolved lazily per request from
  `NEXT_PUBLIC_API_BASE_URL`. No URL is hard-coded, and importing the module never
  throws when configuration is absent.
- **Timeouts** — default 15s, per-request override, `<= 0` disables. Implemented
  with an `AbortController` linked to the caller's signal.
- **Cancellation** — a caller-initiated abort rethrows the original `AbortError`
  so TanStack Query treats it as cancellation, not failure. A timeout instead
  raises a normalized `ApiError`.
- **JSON handling** — request bodies are JSON-encoded unless they are `FormData`,
  `URLSearchParams`, `Blob`, or `ArrayBuffer`, which pass through untouched so the
  browser can set the multipart boundary (needed later for CSV upload).
- **Envelope unwrapping** — the backend returns `{ "success": true, "data": … }`;
  the client returns `data` directly. Non-enveloped JSON is returned as parsed.
- **Response formats** — `json` (default), `text`, `blob`, `void`. `blob`/`text`
  exist for future CSV report downloads.
- **Auth** — a bearer token is attached when the auth store holds a valid session.
  Opt out per request with `withAuth: false`.

It exposes `get`, `post`, `put`, `patch`, and `delete`, and defines **no business
endpoints**. Feature modules build their own request functions on top, composing
paths from the `API_V1_PREFIX` constant.

The client is a class with an injectable `fetchImpl`, `baseUrl`, and
`getAccessToken`, so tests construct isolated instances instead of mutating global
state.

### Error model

`src/lib/api-error.ts` normalizes every failure into an `ApiError` carrying:

| Field       | Meaning                                                          |
| ----------- | ---------------------------------------------------------------- |
| `status`    | HTTP status, or `0` for transport failures                       |
| `code`      | `validation_error`, `network_error`, `http_500`, …               |
| `kind`      | `http` \| `network` \| `timeout` \| `parse`                      |
| `message`   | Always display-safe                                              |
| `details`   | Normalized field-level validation issues                         |
| `requestId` | Correlation id from `x-request-id` / `x-correlation-id`, if sent |

Convenience getters: `isClientError`, `isServerError`, `isUnauthorized`,
`isValidationError`.

**Security properties.** `message` is either taken from the backend's error
envelope (whose messages are user-facing by contract) or derived from the status.
Raw response bodies are never interpolated into it, so an HTML error page, proxy
response, or stack trace cannot reach the UI. Backend messages are length-capped.
`toDisplayMessage()` refuses to stringify non-`ApiError` values for the same
reason.

The backend does not currently emit a correlation-id header; the client reads one
if present, which costs nothing and works the day it is added.

## TanStack Query strategy

`src/lib/query-client.ts` exports `createQueryClient()`. A **factory**, not a
module-level singleton: a shared client would leak one user's cache across
concurrent server renders. `app/providers.tsx` holds the instance in React state.

Defaults chosen for a dashboard workload:

| Option                 | Value   | Rationale                                                     |
| ---------------------- | ------- | ------------------------------------------------------------- |
| `staleTime`            | 60s     | Forecast and inventory data does not change per second        |
| `gcTime`               | 5min    | Keeps recently visited panels warm                            |
| `refetchOnWindowFocus` | `false` | Focus-driven refetch causes request storms on dashboards      |
| `refetchOnReconnect`   | `true`  | Recover after connectivity loss                               |
| `retry`                | policy  | See below                                                     |
| `retryDelay`           | backoff | `min(1000 × 2ⁿ, 30s)`                                         |
| mutation `retry`       | `false` | Mutations are not idempotent; retrying risks duplicate writes |

`shouldRetryRequest` retries transport failures, timeouts, 5xx, and the transient
408/429. It does **not** retry deterministic client errors (401, 403, 404, 409, 422) — they fail identically on retry — nor non-transport errors, which are code
defects rather than network noise.

Future modules own their query keys and hooks inside their own feature slice.

## Auth architecture

`src/lib/auth.ts` and `src/hooks/use-auth.ts` provide the generic in-memory
session store and the token-safe store hook. Module 1 extends that foundation
through `src/features/auth/`; there are still no Auth HTTP requests, endpoint
paths, refresh calls, or production token persistence.

The store is created by `createAuthStore()` and exposes `getState`, `subscribe`,
`setSession`, `clearSession`, `getAccessToken`, and `isAuthenticated`. Snapshots
are reference-stable between mutations, as `useSyncExternalStore` requires.

**Security decisions:**

- Sessions are held **in memory** by default. Nothing is written to
  `localStorage` or `sessionStorage` by the foundation, so tokens cannot be read
  by injected scripts or survive a reload.
- The backend contract returns the refresh token in the response body, so the
  client must hold it somewhere. That policy decision belongs to the Auth module;
  `AuthSessionStorage` is the seam for it, keeping the choice out of the
  foundation.
- `useAuth()` deliberately does **not** return the access token. Exposing it would
  route credentials through render trees, props, and error reports. Outgoing
  requests read it from the store via the API client.
- Expired sessions withhold the token, clear stale identity data, and report
  `unauthenticated`. When there are active subscribers, the store schedules that
  transition at expiry so UI state cannot remain authenticated after the token
  stops being sent.
- The store is client-only: module state on the server is shared across requests,
  so `useAuth` reports an unauthenticated snapshot during SSR.

The expiry timer is local state management only: it makes no network call and
does not implement token refresh. Refresh logic remains the responsibility of
the Auth module.

### Module 1 Auth feature

`src/features/auth/` is a vertical slice containing:

- `api.ts` — an `AuthService` adapter contract. The normal adapter is explicitly
  unavailable until backend integration; it performs no fetches. Playwright sets
  `NEXT_PUBLIC_AUTH_E2E_TEST_MODE=true` to select a deterministic test-only
  adapter. That adapter persists only a test email in `sessionStorage` for
  full-page E2E navigation, never a token, and is not selected by normal builds.
- `schemas.ts` — login and registration Zod schemas aligned to the backend's
  email normalization and password policy. `confirmPassword` is UI-only.
- `components/auth-provider.tsx` — initialization and pending-action state over
  the single Foundation `authStore`; it does not create a second session source.
- `components/login-form.tsx`, `register-form.tsx`, and `logout-button.tsx` —
  React Hook Form UI with safe errors, loading states, and no credential logging.
- `components/protected-route.tsx` and `public-only-route.tsx` — client UX
  boundaries for protected and public Auth routes.
- `redirects.ts` — accepts internal paths only and rejects open redirects.

Routes are server components by default: `/login` and `/register` compose small
client-side form/boundary components; `/dashboard` composes the protected Module
2 Dashboard feature without creating a second Auth boundary.

The backend register contract currently returns a token pair, so registration is
modelled as the same session transition as login. A future HTTP adapter maps that
response without changing UI, schemas, or route behavior.

**Frontend Auth route protection is not the backend authorization boundary.** It
only controls navigation and rendering. Backend APIs must independently enforce
authentication and authorization when integration is enabled.

## Dashboard architecture

`src/features/dashboard/` is the Module 2 vertical slice:

- `types.ts` defines dashboard-facing, normalized projections aligned to the
  backend Dashboard Analytics summary: KPI counts, demand-trend points,
  inventory-risk items, and reorder alerts. It does not duplicate Product,
  Inventory, Forecast, or Recommendation domain entities.
- `api.ts` defines `DashboardService`. The normal adapter resolves to `null`,
  which renders the honest no-data state and performs no HTTP request or endpoint
  composition. A future HTTP adapter will normalize `/dashboard/summary` through
  the Foundation API client without changing feature components.
- `hooks.ts` owns the explicit `loading`, `ready`, `empty`, and `error` view
  state. It is deliberately independent from Auth state and ready to become a
  TanStack Query integration seam when live server state is enabled.
- `components/` composes reusable KPI cards, a lightweight responsive SVG demand
  chart, reorder-alert and inventory-risk summaries, and a structural skeleton.
  The chart has textual summary content, so visual data is not its only accessible
  representation.

The server `app/dashboard/page.tsx` reuses `ProtectedRoute`, `AppShell`,
`PageContainer`, and `LogoutButton` from completed modules. The smallest client
boundary is `DashboardView`, which uses the feature hook. No global Dashboard
store or second Auth system exists.

No chart package was added: the current static demand projection is served by a
small responsive SVG, avoiding an unnecessary client dependency. Runtime
Dashboard components are prop/state driven and contain no fake KPI, alert, risk,
or chart values. Deterministic values live only in `src/tests/fixtures/dashboard.ts`.
The Playwright-only service is selected with
`NEXT_PUBLIC_DASHBOARD_E2E_TEST_MODE=true` in `playwright.config.ts` and reads
serialized test fixtures from browser session storage; normal builds never select
it.

**Module 2 implements Dashboard frontend architecture and UI only. Real Dashboard
Analytics API integration remains deferred.** Frontend route protection is a UX
boundary; backend authorization remains the authoritative security boundary once
API integration is enabled.

## Products architecture

The Module 3 Product Catalog lives in the Product feature slice:

- Types define only safe public Product fields and the backend-supported unit and
  active/inactive status values. Product inventory, category management, sales,
  and vendor models are intentionally not represented here.
- The service contract has list, create, and update operations. Its normal
  implementation is unavailable by design: it composes no endpoint and makes no
  runtime request. A future HTTP adapter can map the Product Catalog contract
  through the shared API client without changing the UI.
- The state hook expresses loading, ready, empty, error, and create/update
  pending states without a competing global store. It is a future TanStack Query
  seam, but local no-network state does not force TanStack Query prematurely.
- Zod schemas mirror backend normalization and constraints for name, SKU, units,
  optional description, non-negative prices with up to two decimals, and update
  status. React Hook Form keeps validation feedback and duplicate-submit
  prevention inside the small client form boundary.
- Components compose an accessible Product table, search and active-status
  filters, explicit empty/error/skeleton states, and a reusable dialog for
  create/edit forms. The server Products route is protected by the existing Auth
  boundary and reuses the existing app shell and logout control.

The normal application never contains test Product records or claims a local
create/edit is a persistent server write. Only the Playwright-managed build
selects the Product fixture adapter through the Products E2E test-mode variable.
That adapter reads and writes session-scoped browser fixture state supplied by
the E2E test; it is not selected by normal builds and stores no credentials or
tokens.

Product list search and active-status filtering align to the read-only inspected
backend contract. Category selection is deliberately omitted because categories
are a separate out-of-scope UI concern and the backend permits no category.
Archive/delete, bulk actions, import/export, inventory operations, and Product
images are likewise not part of Module 3.

Frontend Product route protection is UX only. Backend Product Catalog APIs must
independently enforce authentication and authorization once integration is
enabled.

## Inventory architecture

The Module 4 Inventory feature is an isolated `src/features/inventory/` vertical
slice. `types.ts` exposes only backend-safe inventory and embedded Product
references; it does not duplicate Product Catalog CRUD or model movement history.
`schemas.ts` and `stock-update-form.tsx` use React Hook Form and Zod to mirror the
read-only inspected movement contract: `stock_in` and `stock_out` require a
positive quantity, `adjustment` sets an absolute non-negative quantity, and
`correction` accepts a non-zero signed delta. Quantities permit no more than three
decimal places and are retained as text at the form-to-adapter boundary.

`api.ts` defines `InventoryService` with separate list, dedicated low-stock list,
and immutable stock-movement operations. The normal service uses the established
authenticated Foundation client for `GET /api/v1/inventory/items`,
`GET /api/v1/inventory/low-stock`, and `POST /api/v1/inventory/movements`.
Wire mappers convert snake_case values and Decimal-compatible numeric strings at
the feature boundary. The low-stock endpoint remains the sole authority for
threshold evaluation, including zero-stock items; its current API contract only
accepts limit/offset, so existing search/status controls refine that
backend-authoritative projection for presentation only. The UI never derives
low-stock state from the complete Inventory list.

`hooks.ts` uses Inventory-scoped TanStack Query keys for explicit loading, ready,
empty, error, and stock-update-pending state. A successful immutable movement
invalidates only those Inventory keys, then refetches the server projection;
there is no optimistic stock calculation. `components/` composes a semantic,
mobile-contained inventory table,
backend-supported search/status controls, the dedicated low-stock view, safe
empty/error states, and an accessible movement dialog. The server route
`app/inventory/page.tsx` reuses the existing `ProtectedRoute`, `AppShell`,
`PageContainer`, and `LogoutButton`; it creates no new Auth system.

Only the Playwright-managed build selects the deterministic Inventory adapter via
`NEXT_PUBLIC_INVENTORY_E2E_TEST_MODE=true`. It reads and writes test-supplied,
session-scoped fixtures, never credentials or tokens. An opt-in
`e2e/inventory.real.spec.ts` supplements it against an explicitly configured
FastAPI environment. Normal application builds do not ship fake inventory data
or local persistence.

**Frontend Inventory route protection is UX only. Backend Inventory APIs must
independently enforce authentication and authorization when integration is
enabled.**

## Sales Upload architecture

Module 5 is an isolated `src/features/sales/` slice. `types.ts` exposes safe
upload-batch and rejected-row projections; raw CSV row data is intentionally not
modeled. `schemas.ts` preflights only the read-only inspected backend contract:
one `.csv` file, a 5 MiB maximum, allowed CSV MIME types, and normalized required
headers `sale_date`, `product_sku`, and `quantity`. It reads only a bounded header
prefix and leaves product ownership, duplicate-content detection, row validation,
and all persistence to the backend.

`hooks.ts` owns a mutually exclusive `idle`, `validating`, `ready`, `uploading`,
`success`, `validation_error`, or `error` state. The backend completes upload
work synchronously, so the UI deliberately has no processing or polling state.
`api.ts` declares `SalesUploadService` without endpoint composition or a runtime
request; the normal adapter reports availability truthfully. A future HTTP
adapter will submit the file and retrieve the backend's paginated rejected-row
projection before resolving the safe UI submission model.

`app/sales/upload/page.tsx` reuses `ProtectedRoute`, `AppShell`,
`PageContainer`, and `LogoutButton`. The view uses a native file input, semantic
`<progress>`, and a bounded rejected-rows table. The Playwright-only service is
selected with `NEXT_PUBLIC_SALES_UPLOAD_E2E_TEST_MODE=true` and reads only a
test-supplied session fixture; it never stores file content, credentials, or
tokens and is not enabled in a normal build.

**Frontend Sales Upload route protection is UX only. Backend Sales Upload APIs
must independently enforce authentication and authorization when integration is
enabled.**

## Sales History architecture

Modules 5 and 6 share the `src/features/sales/` boundary without sharing UI
responsibilities. Module 5 owns CSV selection and upload results; Module 6 owns
the protected, read-only `app/sales/page.tsx` history view. `types.ts` adds a
minimal Sales Transaction product reference and safe transaction projection: the
table does not model customers, notes, deleted metadata, or Product Catalog edit
state.

`SalesHistoryService` defines separate list and trend methods because the
inspected Sales Transaction contract exposes independent endpoints. The normal
adapter returns no data and composes no URL or network request. Its future HTTP
adapter will preserve the backend's inclusive ISO date filters, source/search
semantics, `limit`/`offset` pagination (limit 1–200), and default `sale_date`
descending sort. The UI intentionally offers product/SKU search rather than a
Product Catalog lookup before integration; it does not invent client-side server
pagination or transaction mutations.

`useSalesHistory` keeps list and chart states independent so an available table
is not hidden by a trend failure. `salesHistoryFiltersSchema` validates calendar
date input and rejects start-after-end ranges before a future request. The
semantic table has responsible horizontal containment, and the lightweight SVG
quantity trend reuses the Dashboard chart pattern. Currency symbols are omitted
until application currency configuration exists. Deterministic transaction and
trend values live only in `src/tests/fixtures/sales-history.ts`.

> Module 6 implements Sales History frontend UI and architecture only. Real Sales Transaction API integration remains intentionally deferred.

**Frontend Sales History filtering and route protection are UX controls. Backend
APIs remain responsible for authorization, ownership checks, and authoritative
filtering when integration is enabled.**

## Forecast Run architecture

`features/forecasting/` is the Module 7 vertical slice:

```text
features/forecasting/
  api.ts        ForecastRunService boundary and Playwright-only fixture adapter
  hooks.ts      Explicit frontend action/state orchestration
  schemas.ts    RHF/Zod forecast-horizon validation and request normalization
  types.ts      Safe public run projection and discriminated UI states
  components/   Form, lifecycle-status card, and page composition
```

`app/forecasts/runs/page.tsx` remains a Server Component that composes the
existing `ProtectedRoute`, `AppShell`, `PageContainer`, and `LogoutButton` with
the small client-side `ForecastRunView`. The view collects only `horizonDays`;
there is no product selection because the inspected backend creates global runs.
The form accepts only 7, 15, and 30 days and normalizes the native select string
at the feature boundary.

`ForecastRunService` declares `startForecast()` and `getForecastRunStatus()` but
the normal adapter does not compose a route, send an HTTP request, or invoke ML.
The future HTTP adapter can map backend creation/status calls into this boundary
without changing the UI. The backend creates a pending run and processes it
asynchronously; the frontend represents `pending`, `running`, `completed`,
`failed`, and `cancelled` status but has no cancellation control in Module 7.
It exposes explicit manual status refresh rather than speculative production
polling. The backend provides no percentage progress, so the UI intentionally
uses lifecycle text only.

`ForecastRunViewState` is a discriminated union separate from backend lifecycle
status: `idle`, `starting`, `tracking`, `checking_status`, `status_error`,
`completed`, `failed`, and `cancelled`. This prevents a request-pending flag and
server status from becoming contradictory. Failed status detail is normalized to
safe frontend copy; raw `failureReason` is deliberately not rendered.

Playwright's managed build alone sets
`NEXT_PUBLIC_FORECAST_RUN_E2E_TEST_MODE=true`. Its isolated adapter reads only
serialized, test-supplied lifecycle fixtures from `sessionStorage`; normal builds
contain no forecast run, prediction, result, progress, or ML fixture data.

> Module 7 is a Forecast Run configuration and status surface only. Forecast
> results, predictions, metrics, and charts belong to Module 8; reorder
> recommendations belong to Module 9. They remain outside the Module 7 UI.

**Frontend Forecast Run route protection and lifecycle presentation are UX only.
Backend APIs must independently enforce authentication, authorization, ownership,
validation, and run lifecycle transitions when integration is enabled.**

## Forecast Results architecture

Module 8 extends `features/forecasting/` without changing the Module 7 Forecast
Run composition:

```text
features/forecasting/
  api.ts        ForecastResultsService boundary and Playwright-only fixture reader
  hooks.ts      Query-local loading, ready, empty, not-ready, failed, and error state
  schemas.ts    Validated UUID run id and backend-supported result filters
  types.ts      Safe overview, metrics, prediction, chart, pagination projections
  components/   Summary, metrics, filters, table, chart, skeleton, and page view
```

`app/forecasts/results/page.tsx` is a Server Component that accepts the optional
untrusted `runId` query parameter and passes it to the protected client boundary.
The feature accepts only UUID values, renders an explicit no-selection/invalid-id
state otherwise, and never selects a “latest” run. Filters are limited to the
inspected result-list contract: product/SKU search and inclusive forecast dates;
the list uses backend-shaped `limit`/`offset` pagination and forecast-date sort.

`ForecastResultsService` is a transport-neutral read boundary. Its normal adapter
does not compose an endpoint or make a request. A future HTTP adapter can compose
the backend overview, prediction-list, metrics, and chart reads without changing
the components. The Playwright-only adapter is selected only when
`NEXT_PUBLIC_FORECAST_RESULTS_E2E_TEST_MODE=true` and reads a test-supplied,
session-scoped fixture. It is not a production mock backend or data store.

The summary shows only backend response fields. Evaluation cards render only MAE,
RMSE, and MAPE. The prediction table deliberately has no actual-demand column,
because actual quantity is absent from its backend contract. The separate
aggregate chart carries nullable `actualQuantity`; `null` is shown as unavailable
and is never coerced to zero. Its chart failure remains local so available summary
and prediction data can remain usable when the future adapter supports partial
responses.

> Frontend Forecast Results route protection, UUID validation, and filter UI are
> user-experience controls only. Backend APIs must independently enforce
> authentication, authorization, run ownership, result readiness, and filtering
> when integration is enabled.

## Recommendations architecture

Module 9 adds its own read-only vertical slice without changing the existing
Forecast Run or Forecast Results feature boundaries:

```text
features/recommendations/
  api.ts        RecommendationsService boundary and Playwright-only fixture reader
  hooks.ts      Local search, risk-filter, pagination, loading, ready, and error state
  schemas.ts    Backend-aligned risk-filter validation
  types.ts      Safe recommendation, forecast-run reference, query, and view types
  components/   Risk badge, quantity display, toolbar, table, skeleton, and page view
```

`app/recommendations/page.tsx` remains a Server Component that composes the
existing protected-route boundary, application shell, and client-side
`RecommendationsView`. The view supports only the inspected list contract:
Product/SKU search, the five backend risk levels (`low`, `medium`, `high`,
`critical`, and `overstocked`), the read-only backend statuses (`open`,
`acknowledged`, and `dismissed`), and `limit`/`offset` pagination ordered by the
backend's generated timestamp. It presents backend-generated quantities with up
to three fraction digits, preserving zero, and renders a nullable reason safely.

`RecommendationsService` is transport-neutral. Its normal implementation never
builds an endpoint, calls a backend, calculates risk, or persists data. A future
HTTP adapter can map the backend list response and query fields at this boundary
without rewriting the feature; that adapter can then be composed through the
existing TanStack Query provider without introducing another cache or provider.
Only the Playwright-managed build selects the
validated, session-scoped fixture adapter through
`NEXT_PUBLIC_RECOMMENDATIONS_E2E_TEST_MODE=true`; it is not a production mock or
storage strategy.

There are deliberately no recommendation action controls, status updates,
acknowledgement/dismissal behavior, thresholds, or client-side reorder/risk
calculations in Module 9. Those remain backend-owned or future-scope concerns.
The Dashboard high-risk summary remains an aggregate surface and was not changed;
Recommendations is the detailed list. Forecast Results remains the separate
prediction/metric/chart surface. Reports and Settings remain outside this module.

> Module 9 implements Recommendations frontend UI and architecture only. Real
> Reorder Recommendation API integration remains intentionally deferred.

> Frontend Recommendations route protection and filter UI are user-experience
> controls only. Backend APIs must independently enforce authentication,
> authorization, tenancy/ownership, validation, and recommendation-action rules
> when integration is enabled.

## Form validation strategy

`src/lib/forms.ts` establishes the pattern: one Zod schema per form, the
TypeScript type inferred with `z.infer`, wired to React Hook Form through
`zodResolver`.

```ts
const schema = z.object({ email: z.string().email() });
type Values = z.infer<typeof schema>;
const form = useForm<Values>({ resolver: zodResolver(schema) });
```

`applyApiValidationErrors()` projects an `ApiError`'s validation details onto form
fields so server-side validation appears next to the offending input. Issues with
no field — or naming a field the form does not own — are routed to a form-level
handler rather than silently dropped onto an unregistered field.

No concrete form schema exists in the foundation.

## Styling and design tokens

Tailwind CSS 4 with CSS-first configuration; there is no `tailwind.config.js`.
`src/app/globals.css` declares semantic CSS variables, then exposes them to
Tailwind via `@theme inline`. Because the generated utilities reference the
variables, the dark palette is a pure variable override under
`prefers-color-scheme: dark` — no `dark:` variant is needed on individual
elements.

Tokens: `background`, `surface`, `surface-muted`, `foreground`,
`foreground-muted`, `border`, `primary`, `primary-hover`, `primary-foreground`,
`accent`, `success`, `warning`, `danger`, `danger-hover`, `danger-foreground`,
`ring`.

The base layer sets typography defaults, a global `:focus-visible` outline so no
interactive element lacks a focus indicator, and a `prefers-reduced-motion`
override.

Typography uses the platform font stack deliberately: no webfont is fetched at
build or runtime, so builds work offline and there is no layout shift.

## Observability

`src/lib/logger.ts` is the only sanctioned `console` boundary; ESLint forbids
`console` everywhere else. It gates `debug`/`info` out of production and redacts
values under keys matching `token`, `password`, `secret`, `authorization`,
`cookie`, `apikey`, `credential` (case-insensitive, including nested objects), so
credentials cannot reach the console.

No external monitoring platform is configured. Because the logger is the single
sink, adding one later is a change to that module alone. The error boundaries log
only `error.digest`, never the message or stack, which in production may carry
server-side detail.

## Security posture

- No secrets in source; `.env.example` holds placeholders only.
- `NEXT_PUBLIC_*` is documented as browser-inlined and secret-free.
- No `dangerouslySetInnerHTML` anywhere.
- Baseline security headers in `next.config.ts`:
  `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `X-DNS-Prefetch-Control`, `Permissions-Policy`. `poweredByHeader` is disabled.
- The root page reports whether the API URL is _configured_, never its value, so
  deployment topology is not echoed to the page.
- The app is marked `noindex, nofollow`; it is an authenticated internal tool.

**Known gap:** no Content-Security-Policy. A strict CSP for Next.js requires
per-request nonce plumbing through the middleware and script loader; it is
deliberately deferred rather than shipped as an ineffective `unsafe-inline`
policy.

## Testing architecture

Three layers, each testing what it is best at:

| Layer     | Tool         | Verifies                                       |
| --------- | ------------ | ---------------------------------------------- |
| Unit      | Vitest       | `lib/` and `types/` logic in isolation         |
| Component | Vitest + RTL | Rendering, accessibility, and interaction      |
| E2E       | Playwright   | Real browser behavior of the whole application |

MSW backs every HTTP interaction under Vitest with
`onUnhandledRequest: 'error'`, so no test can silently reach the network. Mock
handlers cover only the infrastructure health endpoint — no business fixtures
exist.

Details: [`testing.md`](testing.md).

## Future module integration strategy

For each module, in order:

1. Create the slice under `src/features/<feature>/`.
2. Define Zod schemas and feature types; derive TS types from the schemas.
3. Add API functions in `api/`, built on `apiClient` with paths composed from
   `API_V1_PREFIX`. This is where backend integration actually begins.
4. Add TanStack Query hooks in `hooks/`, owning that feature's query keys.
5. Build components from `@/components/ui`, using the shared `EmptyState`,
   `ErrorState`, `Spinner`, and `Skeleton` for the three non-success states.
6. Compose routes under `src/app/`, reusing `AppShell` and `PageContainer`.
7. Add MSW handlers under `src/tests/mocks/`, component tests, and E2E specs per
   [`testing.md`](testing.md).
8. Update `README.md`, `docs/progress.md`, `docs/testing.md`,
   `docs/commands.md`, `docs/project-runner.md`, and `project_runner.md`.

The foundation is designed so none of these steps requires changing foundation
code: the API client, error model, query client, auth store, and UI primitives are
already the extension points.

## Reports architecture

Module 10 introduces a self-contained, read-only Reports slice:

```text
features/reports/
  api.ts        ReportsService / CSV export boundary, unavailable in normal runtime
  hooks.ts      Selected report, filter validation, loading/error, and export state
  schemas.ts    Backend-aligned date, UUID, channel, and required-run validation
  types.ts      Report types, selected-table projection, query, summary, and export types
  components/   Filters, summary, table, CSV action, skeleton, and composed page view
```

`app/reports/page.tsx` is a Server Component that composes the existing
`ProtectedRoute`, `AppShell`, `PageContainer`, and client-side `ReportsView`.
The selector exposes only the inspected backend contracts: model performance,
inventory risk, reorder summary, demand forecast, and sales summary. The filter
surface changes by report type: dates and forecast run for model performance;
category/stock status for inventory risk; run/risk/status for reorder summary;
a required run plus product/category/dates for demand forecast; and dates,
product/category, and channel for sales summary. Client validation prevents an
invalid inclusive date range and a missing demand-forecast run ID.

The service boundary contains no endpoint path and calls no HTTP client. A future
HTTP adapter maps each backend response to the active report's `ReportData`
projection and can join the existing TanStack Query provider without a new cache
or provider. The current backend export is synchronous, produces a `text/csv`
attachment, and supports CSV only; `ReportExportState` therefore models
`idle`, `preparing`, `ready`, and `error`, not an invented job/polling flow. The
normal service rejects unavailable report/export operations safely. Test-only
component fixtures inject deterministic rows and export metadata but never create
a browser download or become reachable from the production build.

Reports is an aggregate presentation layer, not a duplicate Product, Inventory,
Sales, Forecast, or Recommendation workflow. It includes no mutations,
calculations, background jobs, or Settings behavior.

> Module 10 implements Reports frontend UI and export architecture only. Real
> Reports API and report export integration remain intentionally deferred.

> Frontend Reports route protection controls user experience only. Backend APIs
> must independently enforce authentication, authorization, ownership, report
> filters, and export access when integration is enabled.

## Settings architecture

Module 11 is a narrowly scoped Settings slice:

```text
features/settings/
  api.ts        SettingsService boundary, unavailable in normal runtime
  hooks.ts      Loaded state and independently saved forecast/inventory categories
  schemas.ts    RHF-native Zod values and Decimal-safe normalization
  types.ts      Forecast Defaults, Safety Stock Defaults, and explicit load state
  components/   Two forms, loading skeleton, and composed page view
```

`app/settings/page.tsx` remains a Server Component and composes the existing
`ProtectedRoute`, `AppShell`, `PageContainer`, and client-side `SettingsView`.
No provider, global Settings store, navigation guard, or alternate Auth mechanism
was introduced.

Read-only backend inspection found the user-scoped Settings contract. Forecast
defaults have `7 | 15 | 30` horizon days, a 1-365-day history window,
`random_forest | baseline`, and auto-processing. Inventory safety stock is an
absolute Decimal from `0` through `99999999999.999`, with no more than three
decimal places. Settings preserves safety-stock input as text through validation
and mapping, avoiding JavaScript floating-point coercion. It intentionally does
not model minimum stock, low-stock alerts, profile preferences, model tuning, or
any client-side safety-stock/reorder calculation.

The service expresses independently persisted forecast and inventory categories
without embedding an endpoint path. The normal service rejects operations safely,
so production does not display invented defaults, persist locally, or claim a
remote save. Tests alone inject deterministic feature-scoped adapters. A future
HTTP adapter can map the existing backend contract here and join the existing
TanStack Query provider without architectural replacement.

> Module 11 implements Settings frontend UI and architecture for Forecast
> Defaults and Safety Stock Defaults. Real persistence/API integration remains
> intentionally deferred unless an existing backend contract is connected during
> the integration phase.

> Frontend Settings route protection controls user experience only. Backend APIs
> must independently enforce authentication, authorization, and user ownership.

## Shared UI / final consolidation architecture

Module 12 retains `src/components/ui/` as a presentational layer with a single
dependency direction:

```text
features/*  -> components/ui -> lib/utils
app/*       -> features/* and components/*
```

`components/ui` must not import a feature, feature model, query hook, service,
or API client. Features own their business vocabulary, row/column definitions,
filtering, data-fetch state, and accessibility copy; they compose shared
presentation primitives rather than exporting business abstractions sideways.

The audit retained the canonical Button, Input, Label, Select, Textarea, Card,
Dialog, Spinner, Skeleton, EmptyState, ErrorState, Toaster, and layout
primitives unchanged. Two narrowly generic primitives were added:

- `TableScrollArea` owns only responsive horizontal containment. Products,
  Inventory, Sales History, Forecast Results, Recommendations, and Reports keep
  their semantic `<table>`, captions, cells, column order, formatting, and data
  contract inside the owning feature.
- `Pagination` owns only page-position and previous/next controls. Sales
  History, Forecast Results, and Recommendations retain their offset/limit
  calculation and request state. Contextual navigation labels remain injectable
  for feature-specific screen-reader wording.

Status/risk badges have feature-specific semantic mappings, Sales Upload's
native `<progress>` represents a real upload percentage, Forecast Run exposes
lifecycle state rather than percentage progress, and chart/form composition has
no proven generic contract. Those concerns intentionally remain feature-local.

This consolidation did not introduce a new provider, store, API adapter,
navigation mechanism, authentication model, token storage strategy, or backend
request. It is presentation reuse only.

## Integration Phase 1 - live Auth architecture

Phase 1 changes only Foundation transport and Auth. The shared API client remains
the sole HTTP client. It supports explicit browser credentials for Auth requests
and performs at most one coalesced recovery for backend invalid-access-token or
expired-access-token responses. It never refreshes Auth endpoints and never
retries a forbidden response.

The Auth provider owns initialization: refresh through the HttpOnly browser
cookie, retrieve the current safe user, then resolve protected-route rendering.
Access tokens and safe public-user data remain memory-only. The backend-issued
refresh token is never in React state, storage, URLs, logs, or feature types.
Logout and unrecoverable recovery remove only queries whose metadata declares
them protected.

Frontend route protection remains a UX boundary only. FastAPI independently
authenticates every protected endpoint and enforces ownership. Dashboard through
Settings retain their existing no-network adapters until their separate phases.
