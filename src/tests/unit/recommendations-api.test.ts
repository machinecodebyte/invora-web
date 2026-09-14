import { describe, expect, it } from 'vitest';

import {
  createUnavailableRecommendationsService,
} from '@/features/recommendations/api';

describe('Recommendations service boundary', () => {
  it('does not fabricate recommendation data or call a runtime endpoint', async () => {
    await expect(
      createUnavailableRecommendationsService().listRecommendations({
        search: null,
        riskLevel: null,
        status: null,
        limit: 20,
        offset: 0,
        sortBy: 'generated_at',
        sortOrder: 'desc',
      }),
    ).rejects.toMatchObject({
      code: 'recommendations_unavailable',
      message: 'Unable to load recommendations.',
    });
  });
});
