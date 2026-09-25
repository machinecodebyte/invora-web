'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  RecommendationsServiceError,
  recommendationsService,
  type RecommendationsService,
} from '@/features/recommendations/api';
import { isForecastRunId } from '@/features/forecasting/schemas';
import type {
  Recommendation,
  RecommendationFilters,
  RecommendationStatusUpdate,
  RecommendationSummaryViewState,
  RecommendationsViewState,
} from '@/features/recommendations/types';
import { toDisplayMessage } from '@/lib/api-error';

export const DEFAULT_RECOMMENDATION_FILTERS: RecommendationFilters = {
  search: '',
  riskLevel: 'all',
  status: 'all',
};

const RECOMMENDATIONS_PAGE_SIZE = 20;
const GENERIC_RECOMMENDATIONS_ERROR = 'Unable to load recommendations.';

function toSafeMessage(error: unknown): string {
  return error instanceof RecommendationsServiceError
    ? error.message
    : toDisplayMessage(error, GENERIC_RECOMMENDATIONS_ERROR);
}

function toListErrorState(error: unknown): RecommendationsViewState {
  if (
    error instanceof RecommendationsServiceError &&
    error.code === 'recommendations_not_generated'
  ) {
    return { status: 'not_generated' };
  }
  return { status: 'error', message: toSafeMessage(error) };
}

export interface UseRecommendationsResult {
  readonly state: RecommendationsViewState;
  readonly filters: RecommendationFilters;
  readonly isRunContext: boolean;
  readonly isValidRunId: boolean;
  readonly setFilters: (filters: RecommendationFilters) => void;
  readonly clearFilters: () => void;
  readonly setPageOffset: (offset: number) => void;
  readonly reload: () => void;
}

/** Local filter/page orchestration for global and run-scoped Recommendation reads. */
export function useRecommendations(
  forecastRunId: string | undefined,
  service: RecommendationsService = recommendationsService,
): UseRecommendationsResult {
  const [filters, setFiltersState] = useState<RecommendationFilters>(
    DEFAULT_RECOMMENDATION_FILTERS,
  );
  const [offset, setOffset] = useState(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const [settledState, setSettledState] = useState<{
    readonly queryKey: string;
    readonly state: RecommendationsViewState;
  } | null>(null);

  const isRunContext = forecastRunId !== undefined;
  const isValidRunId = !isRunContext || isForecastRunId(forecastRunId);
  const queryKey = `${forecastRunId ?? ''}|${filters.search}|${filters.riskLevel}|${filters.status}|${offset}|${requestVersion}`;
  const state = !isValidRunId
    ? ({ status: 'invalid_run' } as const)
    : settledState?.queryKey === queryKey
      ? settledState.state
      : (settledState?.state ?? ({ status: 'loading' } as const));

  useEffect(() => {
    if (!isValidRunId) {
      return;
    }

    const controller = new AbortController();
    let isCurrent = true;
    const query = {
      riskLevel: filters.riskLevel === 'all' ? null : filters.riskLevel,
      status: filters.status === 'all' ? null : filters.status,
      limit: RECOMMENDATIONS_PAGE_SIZE,
      offset,
    };
    const request =
      forecastRunId === undefined
        ? service.listRecommendations(
            {
              ...query,
              search: filters.search === '' ? null : filters.search,
              sortBy: 'generated_at',
              sortOrder: 'desc',
            },
            { signal: controller.signal },
          )
        : service.listRunRecommendations(
            forecastRunId,
            { ...query, sortBy: 'risk_level', sortOrder: 'desc' },
            { signal: controller.signal },
          );

    void request
      .then((data) => {
        if (isCurrent && !controller.signal.aborted) {
          setSettledState({ queryKey, state: { status: 'ready', data } });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent && !controller.signal.aborted) {
          setSettledState({ queryKey, state: toListErrorState(error) });
        }
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [filters, forecastRunId, isValidRunId, offset, queryKey, requestVersion, service]);

  const setFilters = useCallback((nextFilters: RecommendationFilters): void => {
    setOffset(0);
    setFiltersState(nextFilters);
  }, []);

  const clearFilters = useCallback((): void => {
    setOffset(0);
    setFiltersState(DEFAULT_RECOMMENDATION_FILTERS);
  }, []);

  const setPageOffset = useCallback((nextOffset: number): void => {
    setOffset(Math.max(0, nextOffset));
  }, []);

  const reload = useCallback((): void => {
    setRequestVersion((version) => version + 1);
  }, []);

  return {
    state,
    filters,
    isRunContext,
    isValidRunId,
    setFilters,
    clearFilters,
    setPageOffset,
    reload,
  };
}

/** Loads an aggregate only for a valid run-scoped Recommendations screen. */
export function useRecommendationSummary(
  forecastRunId: string | undefined,
  version: number,
  service: RecommendationsService = recommendationsService,
): RecommendationSummaryViewState {
  const validRunId = forecastRunId !== undefined && isForecastRunId(forecastRunId);
  const queryKey = `${forecastRunId ?? ''}|${version}`;
  const [settledState, setSettledState] = useState<{
    readonly queryKey: string;
    readonly state: RecommendationSummaryViewState;
  } | null>(null);
  const state = !validRunId
    ? ({ status: 'idle' } as const)
    : settledState?.queryKey === queryKey
      ? settledState.state
      : ({ status: 'loading' } as const);

  useEffect(() => {
    if (!validRunId || forecastRunId === undefined) {
      return;
    }
    const controller = new AbortController();
    let isCurrent = true;
    void service
      .getRunSummary(forecastRunId, { signal: controller.signal })
      .then((data) => {
        if (isCurrent && !controller.signal.aborted) {
          setSettledState({ queryKey, state: { status: 'ready', data } });
        }
      })
      .catch((error: unknown) => {
        if (!isCurrent || controller.signal.aborted) {
          return;
        }
        setSettledState({
          queryKey,
          state:
            error instanceof RecommendationsServiceError &&
            error.code === 'recommendations_not_generated'
              ? { status: 'not_generated' }
              : { status: 'error', message: toSafeMessage(error) },
        });
      });
    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [forecastRunId, queryKey, service, validRunId, version]);

  return state;
}

export type RecommendationGenerationState =
  | { readonly status: 'idle' }
  | { readonly status: 'pending' }
  | { readonly status: 'success'; readonly message: string }
  | {
      readonly status: 'error';
      readonly message: string;
      readonly code?: RecommendationsServiceError['code'] | undefined;
    };

/** No-retry, explicit generation mutation. `refresh` is deliberately always false. */
export function useRecommendationGeneration(
  forecastRunId: string | undefined,
  service: RecommendationsService = recommendationsService,
): {
  readonly state: RecommendationGenerationState;
  readonly generate: () => Promise<void>;
} {
  const [state, setState] = useState<RecommendationGenerationState>({ status: 'idle' });
  const inFlightRef = useRef(false);

  const generate = useCallback(async (): Promise<void> => {
    if (forecastRunId === undefined || !isForecastRunId(forecastRunId)) {
      setState({ status: 'error', message: 'A valid forecast run is required.' });
      return;
    }
    if (inFlightRef.current) {
      return;
    }
    inFlightRef.current = true;
    setState({ status: 'pending' });
    try {
      const result = await service.generateRecommendations(forecastRunId, {
        refresh: false,
      });
      setState({
        status: 'success',
        message: `${result.recommendationsCreated} recommendation${result.recommendationsCreated === 1 ? '' : 's'} generated.`,
      });
    } catch (error: unknown) {
      setState({
        status: 'error',
        message: toSafeMessage(error),
        ...(error instanceof RecommendationsServiceError ? { code: error.code } : {}),
      });
    } finally {
      inFlightRef.current = false;
    }
  }, [forecastRunId, service]);

  return { state, generate };
}

export type RecommendationStatusMutationState =
  | { readonly status: 'idle' }
  | { readonly status: 'pending'; readonly recommendationId: string }
  | { readonly status: 'error'; readonly message: string };

/** Status mutation helper; it never performs any Inventory mutation. */
export function useRecommendationStatusMutation(
  service: RecommendationsService = recommendationsService,
): {
  readonly state: RecommendationStatusMutationState;
  readonly updateStatus: (
    recommendationId: string,
    status: RecommendationStatusUpdate,
  ) => Promise<Recommendation | null>;
} {
  const [state, setState] = useState<RecommendationStatusMutationState>({
    status: 'idle',
  });
  const inFlightRef = useRef(false);
  const updateStatus = useCallback(
    async (
      recommendationId: string,
      status: RecommendationStatusUpdate,
    ): Promise<Recommendation | null> => {
      if (inFlightRef.current) {
        return null;
      }
      inFlightRef.current = true;
      setState({ status: 'pending', recommendationId });
      try {
        const updated = await service.updateRecommendationStatus(
          recommendationId,
          status,
        );
        setState({ status: 'idle' });
        return updated;
      } catch (error: unknown) {
        setState({ status: 'error', message: toSafeMessage(error) });
        return null;
      } finally {
        inFlightRef.current = false;
      }
    },
    [service],
  );

  return { state, updateStatus };
}

/** On-demand Recommendation detail read with cancellation and safe error state. */
export function useRecommendationDetail(
  recommendationId: string | null,
  service: RecommendationsService = recommendationsService,
):
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: Recommendation }
  | { readonly status: 'not_found' }
  | { readonly status: 'error'; readonly message: string } {
  const [settledState, setSettledState] = useState<{
    readonly id: string;
    readonly state:
      | { readonly status: 'ready'; readonly data: Recommendation }
      | { readonly status: 'not_found' }
      | { readonly status: 'error'; readonly message: string };
  } | null>(null);
  const state =
    recommendationId === null
      ? ({ status: 'idle' } as const)
      : settledState?.id === recommendationId
        ? settledState.state
        : ({ status: 'loading' } as const);

  useEffect(() => {
    if (recommendationId === null || !isForecastRunId(recommendationId)) {
      return;
    }
    const controller = new AbortController();
    let isCurrent = true;
    void service
      .getRecommendation(recommendationId, { signal: controller.signal })
      .then((data) => {
        if (isCurrent && !controller.signal.aborted) {
          setSettledState({ id: recommendationId, state: { status: 'ready', data } });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent && !controller.signal.aborted) {
          setSettledState({
            id: recommendationId,
            state:
              error instanceof RecommendationsServiceError &&
              error.code === 'recommendation_not_found'
                ? { status: 'not_found' }
                : { status: 'error', message: toSafeMessage(error) },
          });
        }
      });
    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [recommendationId, service]);

  return state;
}
