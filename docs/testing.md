# Testing

## Testing stack

| Tool                          | Role                                                 |
| ----------------------------- | ---------------------------------------------------- |
| **Vitest 4**                  | Test runner for unit and component tests (jsdom)     |
| **React Testing Library**     | Renders components and queries them the way users do |
| **MSW 2**                     | Intercepts HTTP at the network layer                 |
| **Playwright 1.62**           | Drives a real Chromium browser end to end            |
| `@testing-library/user-event` | Realistic keyboard and pointer interaction           |
| `@testing-library/jest-dom`   | Accessibility-aware assertions                       |
| `@vitest/coverage-v8`         | Coverage reporting                                   |

## When each layer is appropriate

**Unit tests** — pure logic with no DOM: error normalization, retry policy,
environment parsing, pagination maths, store behavior, redaction. Fast and
exhaustive on edge cases.

**Component tests** — anything rendered. Assert through the accessible surface
(roles, names, descriptions, states) rather than internals, so tests survive
refactors and double as accessibility checks. Cover loading, empty, error,
disabled, and interaction states.

**E2E tests** — behavior only a real browser can confirm: the app boots, routes
resolve, metadata is right, focus order works, layouts do not overflow. Kept few
and high-value; they are slow relative to the other layers.

Avoid snapshot-heavy tests. A snapshot asserts that markup did not change, not
that behavior is correct, and it fails on every harmless restyle.

## Configuration

### Vitest — `vitest.config.ts`

- `environment: 'jsdom'`, `globals: false` (explicit imports keep types honest)
- `setupFiles: ['./src/tests/setup.ts']`
- `include: ['src/tests/**/*.test.{ts,tsx}']`, `e2e/**` excluded
- `@` → `src` alias mirrored from `tsconfig.json`
- `clearMocks`, `restoreMocks`, `unstubEnvs` — automatic isolation between tests
- Coverage: v8 provider, thresholds at **85%** for statements, branches,
  functions, and lines over `lib/`, `hooks/`, `components/`, and `types/`

### Setup — `src/tests/setup.ts`

- Registers jest-dom matchers
- `cleanup()` after each test
- Starts the MSW server with **`onUnhandledRequest: 'error'`**, resets handlers
  after each test, closes it at the end

That MSW setting is deliberate: an unmocked request fails the test instead of
silently reaching the network.

### MSW — `src/tests/mocks/`

```text
mocks/
  handlers.ts   Default handlers + TEST_API_BASE_URL + errorEnvelope() helper
  server.ts     setupServer instance; lifecycle owned by setup.ts
```

Only the infrastructure health endpoint is mocked
(`GET {TEST_API_BASE_URL}/api/v1/health` → `{ success: true, data: { status: 'ok' } }`).
There are **no product, sales, inventory, forecast, recommendation, or report
MSW handlers** — features add handlers only when real HTTP integration needs
them. Component and E2E fixtures remain feature-scoped and never enable a
production mock backend.
`TEST_API_BASE_URL` is a fixed fake origin, so tests never depend on local
environment configuration.

### Playwright — `playwright.config.ts`

- Chromium project (`Desktop Chrome`)
- `baseURL` from `PLAYWRIGHT_BASE_URL`, default `http://localhost:3000`
- `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`,
  `video: 'retain-on-failure'`
- CI: `forbidOnly`, 2 retries, single worker, GitHub + HTML reporters
- `webServer` runs `npm run build && npm run start` by default, so the smoke test
  observes production output rather than dev-mode overlays

Overrides: `PLAYWRIGHT_WEB_SERVER_COMMAND`, `PLAYWRIGHT_BASE_URL`,
`PLAYWRIGHT_PORT`.

## Foundation, Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, and Forecast Run tests

**367 unit and component tests across 42 files, plus 58 E2E tests. All passing.**

### Unit tests — `src/tests/unit/`

| File                            | Covers                                                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils.test.ts`                 | `cn` conflict resolution, number/date formatting incl. invalid input, URL joining                                                                                                                                                |
| `constants.test.ts`             | Brand strings, `API_V1_PREFIX` matching the backend contract, timeout sanity                                                                                                                                                     |
| `env.test.ts`                   | Env validation: missing/empty/relative/non-http URLs, trailing-slash stripping, environment enum, non-throwing probe                                                                                                             |
| `api-error.test.ts`             | Envelope parsing, safe status fallbacks, **no leakage of HTML/traceback bodies**, message truncation, detail normalization, correlation id, type guards                                                                          |
| `api-client.test.ts`            | Query serialization, envelope unwrapping, JSON vs FormData bodies, all verbs, 204/empty bodies, text/blob/void formats, auth headers, header precedence, HTTP/network/parse errors, timeout vs caller abort, base-URL resolution |
| `auth.test.ts`                  | Expiry maths, memory storage, store lifecycle, subscribe/unsubscribe, snapshot stability, injected storage, instance isolation                                                                                                   |
| `query-client.test.ts`          | Retry policy per status class, backoff and cap, client defaults, no mutation retries, per-call independence                                                                                                                      |
| `toast.test.ts`                 | Queueing, dismissal, auto-dismiss timing, timer cancellation, notification semantics, snapshot stability                                                                                                                         |
| `forms.test.ts`                 | API validation errors mapped to fields, unknown/field-less issues routed to form level, non-`ApiError` inputs ignored                                                                                                            |
| `logger.test.ts`                | Redaction (incl. nested and case-insensitive), level gating in production, behavior when env is misconfigured                                                                                                                    |
| `pagination.test.ts`            | `hasMorePages`, `currentPageNumber`, `totalPageCount`, divide-by-zero guards                                                                                                                                                     |
| `auth-schemas.test.ts`          | Backend-aligned email normalization, login requirements, registration password rules, confirmation mismatch, and UI-only confirmation omission                                                                                   |
| `auth-api.test.ts`              | Unavailable default adapter, deterministic E2E adapter, and test-state cleanup                                                                                                                                                   |
| `auth-redirects.test.ts`        | Internal return paths, external/protocol-relative/backslash rejection, malformed/default fallback                                                                                                                                |
| `dashboard-api.test.ts`         | Unavailable default service, isolated Playwright fixture state, safe fixture failure, and malformed-state fallback                                                                                                               |
| `inventory-schemas.test.ts`     | Backend-aligned stock-in/out, absolute adjustment, signed correction, zero/negative, decimal precision, size, and reason normalization rules                                                                                     |
| `inventory-api.test.ts`         | Unavailable default service, explicit low-stock projection, deterministic test-only movement semantics, insufficient-stock safety, and malformed fixture fallback                                                                |
| `sales-upload-schemas.test.ts`  | CSV extension, MIME, empty/5 MiB limit, normalized headers, missing/duplicate-column preflight behavior                                                                                                                          |
| `sales-upload-api.test.ts`      | Unavailable normal service, deterministic progress/result fixture, safe missing-fixture failure                                                                                                                                  |
| `sales-history-schemas.test.ts` | Inclusive same-day date validation, cleared dates, malformed dates, and start-after-end rejection                                                                                                                                |
| `sales-history-api.test.ts`     | Honest unavailable Sales Transaction list/trend service boundary with no runtime request                                                                                                                                         |
| `forecast-run-schemas.test.ts`  | Backend-supported 7/15/30-day horizons, missing/unsupported rejection, and native-select request normalization                                                                                                                   |
| `forecast-run-api.test.ts`      | Unavailable normal service, deterministic session-scoped lifecycle adapter, and malformed-fixture safety                                                                                                                         |

### Component tests — `src/tests/components/`

| File                       | Covers                                                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button.test.tsx`          | Rendering, default `type="button"`, pointer and keyboard activation, disabled, loading (`aria-busy`, blocked clicks, visible label, status region), variants, class override, attribute forwarding |
| `input.test.tsx`           | Label association, typing, `aria-invalid` present only when invalid, `aria-describedby` error wiring, disabled, `ref` as a plain prop, required marker excluded from the accessible name           |
| `card.test.tsx`            | Composed card regions, heading level control, attribute forwarding; `Spinner` status role and labels; `Skeleton` hidden from assistive tech                                                        |
| `states.test.tsx`          | `EmptyState` defaults/actions/decorative icon and absence of an alert role; `ErrorState` `role="alert"`, conditional retry, custom label, keyboard operation                                       |
| `layout.test.tsx`          | Banner/main/contentinfo landmarks, branding, skip link target and focus order, navigation landmark only when navigation exists, `PageContainer` single `h1`                                        |
| `toaster.test.tsx`         | Hook-raised toasts, `role="alert"` for errors vs `role="status"` otherwise, labelled dismiss control, clear-all, stacking                                                                          |
| `providers.test.tsx`       | TanStack Query provider works end to end (provider → hook → API client → MSW) and surfaces a normalized, display-safe error                                                                        |
| `use-auth.test.tsx`        | Unauthenticated default, sign-in/sign-out transitions, external store updates, and that the **access token never reaches the render tree**                                                         |
| `auth-forms.test.tsx`      | Login and registration labels, validation, credential normalization, safe errors, adapter inputs, and success redirects                                                                            |
| `auth-boundaries.test.tsx` | Protected-route redirect/render behavior and logout state cleanup/navigation                                                                                                                       |
| `dashboard.test.tsx`       | KPI values/unavailable state, demand chart data/empty/loading states, alert and inventory-risk summaries, and composed Dashboard loading/ready/empty/error states                                  |
| `inventory.test.tsx`       | Accessible movement form, field-level validation, safe mutation failure, pending controls, status text, semantic table, and composed loading/ready/empty/filtered-empty/low-stock/error states     |
| `sales-upload.test.tsx`    | Native file input, preflight feedback, selected-file reset, semantic progress, duplicate prevention, safe errors/retry, result summary, and rejected-row table                                     |
| `sales-history.test.tsx`   | Semantic transaction table, zero-value formatting, product/SKU/source/date filters, reset, pagination controls, quantity trend, loading, no-data, filtered-empty, and safe partial/error states    |
| `forecast-run.test.tsx`    | Accessible horizon validation, pending/running/completed lifecycle, duplicate-start prevention, safe failures, refresh retry, and reset                                                            |

### E2E tests — `e2e/foundation.spec.ts`

1. Root page renders the Invora `h1`, banner branding, tagline, and `main`
   landmark, returns HTTP 200, with **no console errors and no page errors**
2. Document title and `lang` attribute are set
3. Skip link is the first focusable element and moves focus to `#main-content`
4. **No business data** appears anywhere in the page body
5. Unknown routes return 404 and render the not-found page
6. Mobile viewport (375×667) renders without horizontal body overflow

### Auth E2E tests — `e2e/auth.spec.ts`

1. Login route renders branding and accessible form controls
2. Login validates missing credentials without a network request
3. Deterministic test-only login reaches the protected Dashboard route
4. Unauthenticated dashboard access redirects safely to login
5. Authenticated protected navigation and public-route bounce behavior work
6. Logout clears state and restores protected-route redirect behavior
7. Registration renders, validates email/password/confirmation, and establishes
   the adapter-backed test session

The Playwright-only adapter is enabled solely through the managed build's
`NEXT_PUBLIC_AUTH_E2E_TEST_MODE=true` variable. Browser contexts isolate the
test-only `sessionStorage` value; no FastAPI process or production credential is
needed.

### Dashboard E2E tests — `e2e/dashboard.spec.ts`

1. Unauthenticated visitors redirect to Login before Dashboard content is exposed
2. An authenticated test session renders KPI cards and the accessible demand chart
3. Deterministic reorder alerts and high-risk inventory summaries render
4. A successful empty Dashboard summary renders section-level empty states
5. A test-only service failure renders only the safe Dashboard error state
6. The populated Dashboard has no horizontal viewport overflow at 375×667

`NEXT_PUBLIC_DASHBOARD_E2E_TEST_MODE=true` is set only by the Playwright-managed
build. `e2e/dashboard.spec.ts` places serialized fixtures in isolated browser
`sessionStorage`; those values are not production source data and no FastAPI
process is contacted.

### Products tests

Product schema tests cover backend-aligned name, SKU, unit, description, price,
and active-status validation plus adapter-boundary normalization. Product service
tests cover the unavailable default, deterministic session-scoped E2E fixture
adapter, create/edit behavior, filtering, and malformed fixture safety.

Product component tests cover accessible form fields, invalid and safe mutation
errors, pending controls, create/update payloads, status text, semantic tables,
dialog focus behavior, loading, ready, filtered empty, successful empty, and
safe error states. The dialog test also covers labelled modal semantics, Escape,
and focus restoration.

Products E2E covers protected-route redirect, authenticated table rendering,
search, active-status filtering, validation, deterministic create/edit,
empty/error states, and mobile layout. The Product E2E fixture adapter is
selected only by the managed Playwright build and never contacts FastAPI.

### Inventory tests

Inventory unit tests cover movement schemas and the no-network adapter boundary.
Component tests cover accessible stock update controls, safe field/form errors,
pending behavior, readable status text, semantic table output, and loading,
empty, filtered-empty, low-stock, and error states.

`e2e/inventory.spec.ts` covers protected-route redirect, authenticated inventory
table rendering, zero and low stock, successful no-low-stock and empty states,
backend-aligned stock-in update, zero/negative/correction validation,
below-zero failure handling, search/status filters, safe service failure, and
375×667 document-overflow containment. Its 12 deterministic browser scenarios
receive only test-supplied session-scoped fixtures under
`NEXT_PUBLIC_INVENTORY_E2E_TEST_MODE=true`; no backend process or production
inventory data is involved.

### Sales Upload tests

Sales Upload unit and component tests cover contract-aligned CSV preflight:
`.csv` extension, supported MIME types, non-empty 5 MiB-or-less files, normalized
required headers, duplicate headers, accessible input/error wiring, selected-file
reset, semantic progress, duplicate submission prevention, safe retry, upload
summary, and a bounded rejected-row table that never exposes raw CSV rows.

`e2e/sales-upload.spec.ts` covers protected navigation, authenticated page load,
valid/unsupported/missing-header selection, deterministic upload progress and
completion, row validation errors, safe failure and retry/reset controls, empty
and oversized files, and mobile overflow. Its 11 scenarios use only
session-scoped fixtures under `NEXT_PUBLIC_SALES_UPLOAD_E2E_TEST_MODE=true`; no
FastAPI service, real upload, or production sales data is involved.

### Sales History tests

Sales History tests use only `src/tests/fixtures/sales-history.ts` and injected
test services. They cover Sales Transaction-shaped table rows, Product/SKU search,
source and inclusive date filters, date-range validation and reset, offset/limit
pagination controls, zero-value formatting, the accessible quantity trend,
loading, no-data, filtered-empty, and independent table/chart error behavior.
No Sales History E2E suite was added: Module 6 requires component testing, while
the completed Modules 1–5 E2E suites remain part of full regression.

### Forecast Run tests

Forecast Run unit and component tests cover the one backend-supported request
field, 7/15/30-day validation, native-select normalization, unavailable normal
service, malformed fixture safety, accessible required feedback, disabled/pending
submission, duplicate-start prevention, `pending`/`running`/`completed` states,
safe failure/status-refresh treatment, and reset for another run. They never
render raw failure detail, prediction data, result metrics, or fake progress.

`e2e/forecast-flow.spec.ts` covers protected-route redirect, authenticated page
load, allowed horizon options, required horizon validation, deterministic
pending/running/completed status refresh, safe failure/reset, status-refresh
failure, and 375Ã—667 overflow containment. Its 7 browser scenarios use only
session-scoped lifecycle fixtures under
`NEXT_PUBLIC_FORECAST_RUN_E2E_TEST_MODE=true`; no FastAPI service, forecast
result, or ML process is used.

### Coverage

Measured with `npm run test:coverage`:

| Metric     | Result | Threshold |
| ---------- | ------ | --------- |
| Statements | 94.46% | 85%       |
| Branches   | 92.95% | 85%       |
| Functions  | 94.89% | 85%       |
| Lines      | 94.38% | 85%       |

Uncovered remainder is in `useCallback` bodies reached only through the shared
module store, and defensive branches in `api-client`/`api-error`.

## Commands

```bash
npm run test              # unit + component
npm run test:unit         # src/tests/unit only
npm run test:components   # src/tests/components only
npm run test:watch        # watch mode
npm run test:coverage     # coverage with thresholds
npm run test:e2e          # Playwright (headless)
npm run test:e2e:ui       # Playwright UI mode
```

Playwright needs a one-time browser install: `npx playwright install chromium`.

## Conventions for future tests

- Query by role and accessible name first; `data-testid` only when no accessible
  query exists (currently just `Skeleton`, which is intentionally hidden from
  assistive technology).
- Prefer `userEvent` over `fireEvent`.
- Assert behavior, not implementation. Do not spy on internals such as
  `setTimeout` to prove a code path; drive the public API and assert the outcome.
- Use `vi.stubEnv` rather than assigning `process.env` so `unstubEnvs` restores it.
- Clear module-level stores (`authStore`, `toastStore`) in `afterEach`.
- Wrap external store updates in `act()`.
- Register per-test MSW handlers with `server.use(...)`; `setup.ts` resets them.
- Never weaken an assertion, skip a test, or delete a failing test to get green.
  Fix the cause.

## Future testing strategy

Per-module minimum, in addition to unit tests for any new `lib/` logic:

| Module           | Required test layers               | Focus                                                                                                                                                |
| ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth             | unit + component + E2E — completed | Schemas, adapter boundary, safe redirects, forms, protected routes, login/registration/logout browser journeys                                       |
| Dashboard        | component + E2E — completed        | KPIs, chart, alerts, high-risk inventory, loading/empty/error states, protected access, and mobile browser flow                                      |
| Products         | unit + component + E2E — completed | Schemas, no-network adapter, forms, list/search/status states, protected route, deterministic create/edit, and mobile browser flow                   |
| Inventory        | unit + component + E2E — completed | Movement schemas, unavailable/test-only adapter, stock update form, table/search/status/low-stock states, protected flow, and mobile browser journey |
| Sales Upload     | component + E2E — completed        | CSV preflight, progress, safe batch summary/rejected rows, protected deterministic upload journey                                                    |
| Sales History    | component — completed              | Transaction table, Product/SKU search, source/date filters, offset/limit pagination, quantity trend, loading/empty/error states                      |
| Forecast Run     | component + E2E — completed        | Global 7/15/30-day configuration, explicit lifecycle status (no percentage progress), protected deterministic run journey                            |
| Forecast Results | component + E2E                    | Prediction tables, charts, metrics, pagination; view-results journey                                                                                 |
| Recommendations  | component + E2E                    | Recommendation list, risk levels, acknowledge/dismiss; acknowledge journey                                                                           |
| Reports          | component                          | Report selection, rendering, CSV export trigger                                                                                                      |
| Settings         | component                          | Preference forms, validation, save and reset feedback                                                                                                |
| Shared UI        | unit + component                   | Every new primitive: rendering, accessibility, interaction, all states                                                                               |

Each module adds MSW handlers for its own endpoints and updates this document
with the tests it introduced.
