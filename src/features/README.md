# Features

Business functionality lives here, one directory per frontend module. Modules 1,
2, 3, 4, and 5 implement the Auth, Dashboard, Products, Inventory, and Sales Upload vertical slices; every
remaining future feature directory remains empty of implementation. No normal-runtime module ships fake business data,
placeholder business logic, or stub API calls.

## Per-feature structure

Each feature owns its full vertical slice:

```text
features/<feature>/
  api/         Request functions built on `@/lib/api-client`, and query keys
  components/  Feature-specific UI, composed from `@/components/ui`
  hooks/       TanStack Query hooks and feature state
  schemas/     Zod schemas and inferred form types
  types/       Feature-owned models (Product, InventoryItem, Forecast, …)
```

Create only the subdirectories a feature actually needs.

## Rules

- A feature may import from `@/components`, `@/hooks`, `@/lib`, and `@/types`.
- A feature must not import from another feature. Promote genuinely shared code
  to `@/components` or `@/lib` instead of reaching sideways.
- Business models belong to the feature that owns them, never to `@/types`,
  which holds transport and generic types only.
- Routes under `src/app` compose features; they do not contain business logic.

## Module ownership

| Directory         | Frontend module                                |
| ----------------- | ---------------------------------------------- |
| `auth`            | Auth                                           |
| `dashboard`       | Dashboard                                      |
| `products`        | Products                                       |
| `inventory`       | Inventory                                      |
| `sales`           | Sales Upload (Module 5); Sales History pending |
| `forecasting`     | Forecast Run, Forecast Results                 |
| `recommendations` | Recommendations                                |
| `reports`         | Reports                                        |
| `settings`        | Settings                                       |

See `docs/architecture.md` for the full architecture and `docs/progress.md` for
module status.
