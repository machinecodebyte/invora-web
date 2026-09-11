# Frontend Architecture

## Scope of this document

How the Invora frontend is organized, why, and how future modules plug in. The
Foundation module establishes this architecture; it implements **no business
module**.

## Next.js App Router

Routes live in `src/app/` using the App Router.

```text
src/app/
  layout.tsx        Root layout: document shell, metadata, viewport, providers
  providers.tsx     Client provider composition (TanStack Query)
  page.tsx          Root page (Foundation status only)
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
client-side form/boundary components; `/dashboard` is an Auth-only protected
placeholder for E2E verification and contains no Dashboard feature behavior.

The backend register contract currently returns a token pair, so registration is
modelled as the same session transition as login. A future HTTP adapter maps that
response without changing UI, schemas, or route behavior.

**Frontend Auth route protection is not the backend authorization boundary.** It
only controls navigation and rendering. Backend APIs must independently enforce
authentication and authorization when integration is enabled.

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
