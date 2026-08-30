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
fixtures** — features add their own handlers when they are implemented.
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

## Foundation tests

**262 unit and component tests across 19 files, plus 6 E2E tests. All passing.**

### Unit tests — `src/tests/unit/`

| File                   | Covers                                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils.test.ts`        | `cn` conflict resolution, number/date formatting incl. invalid input, URL joining                                                                                                                                                |
| `constants.test.ts`    | Brand strings, `API_V1_PREFIX` matching the backend contract, timeout sanity                                                                                                                                                     |
| `env.test.ts`          | Env validation: missing/empty/relative/non-http URLs, trailing-slash stripping, environment enum, non-throwing probe                                                                                                             |
| `api-error.test.ts`    | Envelope parsing, safe status fallbacks, **no leakage of HTML/traceback bodies**, message truncation, detail normalization, correlation id, type guards                                                                          |
| `api-client.test.ts`   | Query serialization, envelope unwrapping, JSON vs FormData bodies, all verbs, 204/empty bodies, text/blob/void formats, auth headers, header precedence, HTTP/network/parse errors, timeout vs caller abort, base-URL resolution |
| `auth.test.ts`         | Expiry maths, memory storage, store lifecycle, subscribe/unsubscribe, snapshot stability, injected storage, instance isolation                                                                                                   |
| `query-client.test.ts` | Retry policy per status class, backoff and cap, client defaults, no mutation retries, per-call independence                                                                                                                      |
| `toast.test.ts`        | Queueing, dismissal, auto-dismiss timing, timer cancellation, notification semantics, snapshot stability                                                                                                                         |
| `forms.test.ts`        | API validation errors mapped to fields, unknown/field-less issues routed to form level, non-`ApiError` inputs ignored                                                                                                            |
| `logger.test.ts`       | Redaction (incl. nested and case-insensitive), level gating in production, behavior when env is misconfigured                                                                                                                    |
| `pagination.test.ts`   | `hasMorePages`, `currentPageNumber`, `totalPageCount`, divide-by-zero guards                                                                                                                                                     |

### Component tests — `src/tests/components/`

| File                 | Covers                                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button.test.tsx`    | Rendering, default `type="button"`, pointer and keyboard activation, disabled, loading (`aria-busy`, blocked clicks, visible label, status region), variants, class override, attribute forwarding |
| `input.test.tsx`     | Label association, typing, `aria-invalid` present only when invalid, `aria-describedby` error wiring, disabled, `ref` as a plain prop, required marker excluded from the accessible name           |
| `card.test.tsx`      | Composed card regions, heading level control, attribute forwarding; `Spinner` status role and labels; `Skeleton` hidden from assistive tech                                                        |
| `states.test.tsx`    | `EmptyState` defaults/actions/decorative icon and absence of an alert role; `ErrorState` `role="alert"`, conditional retry, custom label, keyboard operation                                       |
| `layout.test.tsx`    | Banner/main/contentinfo landmarks, branding, skip link target and focus order, navigation landmark only when navigation exists, `PageContainer` single `h1`                                        |
| `toaster.test.tsx`   | Hook-raised toasts, `role="alert"` for errors vs `role="status"` otherwise, labelled dismiss control, clear-all, stacking                                                                          |
| `providers.test.tsx` | TanStack Query provider works end to end (provider → hook → API client → MSW) and surfaces a normalized, display-safe error                                                                        |
| `use-auth.test.tsx`  | Unauthenticated default, sign-in/sign-out transitions, external store updates, and that the **access token never reaches the render tree**                                                         |

### E2E tests — `e2e/foundation.spec.ts`

1. Root page renders the Invora `h1`, banner branding, tagline, and `main`
   landmark, returns HTTP 200, with **no console errors and no page errors**
2. Document title and `lang` attribute are set
3. Skip link is the first focusable element and moves focus to `#main-content`
4. **No business data** appears anywhere in the page body
5. Unknown routes return 404 and render the not-found page
6. Mobile viewport (375×667) renders without horizontal body overflow

### Coverage

Measured with `npm run test:coverage`:

| Metric     | Result | Threshold |
| ---------- | ------ | --------- |
| Statements | 97.97% | 85%       |
| Branches   | 97.97% | 85%       |
| Functions  | 96.85% | 85%       |
| Lines      | 97.94% | 85%       |

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

| Module           | Required test layers | Focus                                                                                                              |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Auth             | unit + E2E           | Schema validation, token handling, session persistence policy, sign-in/sign-out journey, protected-route redirects |
| Dashboard        | component + E2E      | KPI and chart panels across loading/empty/error states; dashboard loads for an authenticated user                  |
| Products         | component + E2E      | Product forms, validation, list filtering/pagination; create-edit-archive journey                                  |
| Inventory        | component + E2E      | Stock adjustment forms, threshold display, low-stock views; stock movement journey                                 |
| Sales Upload     | component + E2E      | File selection, CSV validation feedback, upload progress, rejected rows; upload journey                            |
| Sales History    | component            | Filters, pagination, summaries, empty states                                                                       |
| Forecast Run     | component + E2E      | Run configuration, pre-flight validation, status polling; trigger-run journey                                      |
| Forecast Results | component + E2E      | Prediction tables, charts, metrics, pagination; view-results journey                                               |
| Recommendations  | component + E2E      | Recommendation list, risk levels, acknowledge/dismiss; acknowledge journey                                         |
| Reports          | component            | Report selection, rendering, CSV export trigger                                                                    |
| Settings         | component            | Preference forms, validation, save and reset feedback                                                              |
| Shared UI        | unit + component     | Every new primitive: rendering, accessibility, interaction, all states                                             |

Each module adds MSW handlers for its own endpoints and updates this document
with the tests it introduced.
