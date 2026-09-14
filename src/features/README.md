# Features

Business functionality lives here, one directory per frontend module. Modules 1,
2, 3, 4, 5, 6, 7, 8, and 9 implement the Auth, Dashboard, Products, Inventory, Sales Upload, Sales History, Forecast Run, Forecast Results, and Recommendations vertical slices. No other future
business scope is implemented. Forecast Results shares `forecasting/` while
remaining separate from the Forecast Run configuration/status UI. Recommendations
owns its own read-only vertical slice and does not calculate risk or reorder
quantities. No normal-runtime module ships fake business data, placeholder
business logic, or stub API calls.

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

| Directory         | Frontend module                                      |
| ----------------- | ---------------------------------------------------- |
| `auth`            | Auth                                                 |
| `dashboard`       | Dashboard                                            |
| `products`        | Products                                             |
| `inventory`       | Inventory                                            |
| `sales`           | Sales Upload (Module 5) and Sales History (Module 6) |
| `forecasting`     | Forecast Run (Module 7), Forecast Results            |
| `recommendations` | Recommendations                                      |
| `reports`         | Reports                                              |
| `settings`        | Settings                                             |

See `docs/architecture.md` for the full architecture and `docs/progress.md` for
module status.
