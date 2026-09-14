'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  RecommendationsServiceError,
  recommendationsService,
  type RecommendationsService,
} from '@/features/recommendations/api';
import type {
  RecommendationFilters,
  RecommendationsViewState,
} from '@/features/recommendations/types';

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
    : GENERIC_RECOMMENDATIONS_ERROR;
}

export interface UseRecommendationsResult {
  readonly state: RecommendationsViewState;
  readonly filters: RecommendationFilters;
  readonly setFilters: (filters: RecommendationFilters) => void;
  readonly clearFilters: () => void;
  readonly setPageOffset: (offset: number) => void;
  readonly reload: () => void;
}

/** Local filter/page orchestration for the future Recommendation list query. */
export function useRecommendations(
  service: RecommendationsService = recommendationsService,
): UseRecommendationsResult {
  const [filters, setFiltersState] = useState<RecommendationFilters>(
    DEFAULT_RECOMMENDATION_FILTERS,
  );
  const [offset, setOffset] = useState(0);
  const [requestVersion, setRequestVersion] = useState(0);
  const [state, setState] = useState<RecommendationsViewState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    void service
      .listRecommendations({
        search: filters.search === '' ? null : filters.search,
        riskLevel: filters.riskLevel === 'all' ? null : filters.riskLevel,
        status: filters.status === 'all' ? null : filters.status,
        limit: RECOMMENDATIONS_PAGE_SIZE,
        offset,
        sortBy: 'generated_at',
        sortOrder: 'desc',
      })
      .then((data) => {
        if (active) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setState({ status: 'error', message: toSafeMessage(error) });
        }
      });
    return () => {
      active = false;
    };
  }, [filters, offset, requestVersion, service]);

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
    setState({ status: 'loading' });
    setRequestVersion((version) => version + 1);
  }, []);

  return { state, filters, setFilters, clearFilters, setPageOffset, reload };
}
