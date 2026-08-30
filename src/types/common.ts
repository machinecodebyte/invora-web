/**
 * Generic, application-wide types.
 *
 * Business models (products, inventory, forecasts, recommendations, reports)
 * belong to their own feature module under `src/features/*`, never here.
 */

/** Lifecycle of any asynchronous operation. */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/** Discriminated async state for hand-rolled state machines. */
export type AsyncState<TData, TError = Error> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: TData }
  | { status: 'error'; error: TError };

/** Sort direction shared by table and list surfaces. */
export type SortDirection = 'asc' | 'desc';

/** Generic sort descriptor keyed by a caller-provided field union. */
export interface SortState<TField extends string = string> {
  field: TField;
  direction: SortDirection;
}

/** Label/value pair for selects, radio groups, and filter controls. */
export interface SelectOption<TValue extends string | number = string> {
  label: string;
  value: TValue;
  disabled?: boolean;
}

/** A value that may be absent. */
export type Nullable<TValue> = TValue | null;

/** Makes the listed keys optional while keeping the rest intact. */
export type WithOptional<TObject, TKeys extends keyof TObject> = Omit<TObject, TKeys> &
  Partial<Pick<TObject, TKeys>>;
