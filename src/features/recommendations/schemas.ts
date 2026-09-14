import { z } from 'zod';

import {
  RECOMMENDATION_RISK_LEVELS,
  RECOMMENDATION_STATUSES,
} from '@/features/recommendations/types';

/** Backend-compatible validation for the two Module 9 list filters. */
export const recommendationFiltersSchema = z.object({
  search: z.string().trim().max(255, 'Search must be 255 characters or fewer.'),
  riskLevel: z.enum(['all', ...RECOMMENDATION_RISK_LEVELS]),
  status: z.enum(['all', ...RECOMMENDATION_STATUSES]),
});

export type RecommendationFilterValues = z.infer<typeof recommendationFiltersSchema>;
