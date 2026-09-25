import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  RecommendationsServiceError,
  type RecommendationsService,
} from '@/features/recommendations/api';
import { RecommendationsView } from '@/features/recommendations/components/recommendations-view';
import type {
  RecommendationGenerationResult,
  RecommendationPage,
} from '@/features/recommendations/types';
import {
  EMPTY_RECOMMENDATIONS_FIXTURE,
  PAGINATED_RECOMMENDATIONS_FIXTURE,
  RECOMMENDATIONS_FIXTURE,
  createRecommendationsTestService,
} from '@/tests/fixtures/recommendations';

describe('RecommendationsView', () => {
  it('renders backend risk/status labels, product/SKU context, reasons, reorder quantities, and valid zeroes', async () => {
    render(<RecommendationsView service={createRecommendationsTestService()} />);

    const table = await screen.findByRole('table', { name: 'Reorder recommendations' });
    expect(screen.getByText('Critical Widget')).toBeVisible();
    expect(screen.getByText('CRIT-001')).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'Critical' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'Medium' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'Overstocked' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'Acknowledged' })).toBeVisible();
    expect(within(table).getByRole('cell', { name: 'Dismissed' })).toBeVisible();
    expect(screen.getByText('2.75 kg')).toBeVisible();
    const overstockedRow = within(table).getByRole('row', { name: /Overstocked Box/ });
    expect(within(overstockedRow).getAllByRole('cell', { name: '0 pcs' })).toHaveLength(
      2,
    );
    expect(screen.getAllByText('—')).not.toHaveLength(0);
  });

  it('filters by risk level and product/SKU search, then resets filter state', async () => {
    const user = userEvent.setup();
    render(<RecommendationsView service={createRecommendationsTestService()} />);
    await screen.findByRole('table', { name: 'Reorder recommendations' });

    await user.selectOptions(screen.getByLabelText('Risk level'), 'critical');
    expect(await screen.findByText('Critical Widget')).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByText('High Risk Cable')).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await screen.findByText('High Risk Cable');
    await user.selectOptions(
      screen.getByLabelText('Recommendation status'),
      'acknowledged',
    );
    expect(await screen.findByText('High Risk Cable')).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByText('Critical Widget')).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    await user.type(screen.getByLabelText('Search recommendations'), 'OVER-005');
    expect(await screen.findByText('Overstocked Box')).toBeVisible();
    await waitFor(() =>
      expect(screen.queryByText('Critical Widget')).not.toBeInTheDocument(),
    );
  });

  it('uses distinct empty and filtered-empty states', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <RecommendationsView
        service={createRecommendationsTestService({
          data: EMPTY_RECOMMENDATIONS_FIXTURE,
        })}
      />,
    );
    expect(await screen.findByText('No recommendations available.')).toBeVisible();

    rerender(<RecommendationsView service={createRecommendationsTestService()} />);
    await screen.findByRole('table', { name: 'Reorder recommendations' });
    await user.type(
      screen.getByLabelText('Search recommendations'),
      'NOT-A-RECOMMENDATION',
    );
    expect(
      await screen.findByText('No recommendations match the current filters.'),
    ).toBeVisible();
  });

  it('paginates with backend offset/limit semantics', async () => {
    const user = userEvent.setup();
    render(
      <RecommendationsView
        service={createRecommendationsTestService({
          data: PAGINATED_RECOMMENDATIONS_FIXTURE,
        })}
      />,
    );
    await screen.findByText('Pagination Product 21');
    expect(screen.getByText('Page 1 of 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Pagination Product 01')).toBeVisible();
    expect(screen.getByText('Page 2 of 2')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('shows loading before a service resolves and does not flash the risk table', async () => {
    let resolvePage: ((page: RecommendationPage) => void) | undefined;
    const service: RecommendationsService = {
      ...createRecommendationsTestService(),
      listRecommendations: () =>
        new Promise<RecommendationPage>((resolve) => {
          resolvePage = resolve;
        }),
    };
    render(<RecommendationsView service={service} />);

    expect(
      screen.getByRole('status', { name: 'Loading recommendations' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('table', { name: 'Reorder recommendations' }),
    ).not.toBeInTheDocument();
    if (resolvePage === undefined) {
      throw new Error('Recommendation resolver was not initialized.');
    }
    resolvePage(RECOMMENDATIONS_FIXTURE);
    expect(
      await screen.findByRole('table', { name: 'Reorder recommendations' }),
    ).toBeVisible();
  });

  it('normalizes unknown service failures without exposing their internals', async () => {
    render(
      <RecommendationsView
        service={createRecommendationsTestService({
          error: new Error('database trace'),
        })}
      />,
    );
    expect(await screen.findByText('Unable to load recommendations.')).toBeVisible();
    expect(screen.queryByText('database trace')).not.toBeInTheDocument();
  });

  it('retains an explicitly safe adapter error message', async () => {
    render(
      <RecommendationsView
        service={createRecommendationsTestService({
          error: new RecommendationsServiceError(
            'recommendations_unavailable',
            'Recommendations are temporarily unavailable.',
          ),
        })}
      />,
    );
    expect(
      await screen.findByText('Recommendations are temporarily unavailable.'),
    ).toBeVisible();
  });

  it('generates a run-scoped recommendation set once, then loads its backend summary', async () => {
    const user = userEvent.setup();
    render(
      <RecommendationsView
        forecastRunId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        service={createRecommendationsTestService({ notGenerated: true })}
      />,
    );

    expect(
      await screen.findByText(
        'Recommendations have not been generated for this forecast run.',
      ),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Generate recommendations' }));
    expect(
      await screen.findByRole('table', { name: 'Reorder recommendations' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Recommendation summary' }),
    ).toBeVisible();
    expect(screen.queryByLabelText('Search recommendations')).not.toBeInTheDocument();
  });

  it('prevents duplicate generation requests before the first request settles', async () => {
    const user = userEvent.setup();
    let resolveGeneration:
      ((value: RecommendationGenerationResult) => void) | undefined;
    const generateRecommendations = vi.fn(
      () =>
        new Promise<RecommendationGenerationResult>((resolve) => {
          resolveGeneration = resolve;
        }),
    );
    const service: RecommendationsService = {
      ...createRecommendationsTestService({ notGenerated: true }),
      generateRecommendations,
    };
    render(
      <RecommendationsView
        forecastRunId="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
        service={service}
      />,
    );

    const button = await screen.findByRole('button', {
      name: 'Generate recommendations',
    });
    await Promise.all([user.click(button), user.click(button)]);
    expect(generateRecommendations).toHaveBeenCalledTimes(1);
    if (resolveGeneration === undefined) {
      throw new Error('Generation resolver was not initialized.');
    }
    resolveGeneration({
      forecastRunId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      totalProducts: 0,
      recommendationsCreated: 0,
      refreshed: false,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      overstockedCount: 0,
    });
  });

  it('loads recommendation detail and applies only a supported status transition', async () => {
    const user = userEvent.setup();
    render(<RecommendationsView service={createRecommendationsTestService()} />);

    await user.click(
      await screen.findByRole('button', {
        name: 'View recommendation details for Critical Widget',
      }),
    );
    expect(
      await screen.findByRole('dialog', { name: 'Recommendation details' }),
    ).toBeVisible();
    expect(screen.getByText('Reorder now')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Acknowledge' }));
    expect(await screen.findByText('acknowledged')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  });
});
