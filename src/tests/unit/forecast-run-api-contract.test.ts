import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { createHttpForecastRunService } from '@/features/forecasting/api';
import { ApiClient } from '@/lib/api-client';
import { errorEnvelope, TEST_API_BASE_URL } from '@/tests/mocks/handlers';
import { server } from '@/tests/mocks/server';

const RUN_ID = '2b0de6bc-1e97-4b55-9bae-0f06a0d65c1e';
const JOB_ID = '00c1e519-d525-4ca5-9c17-965a3d2609d1';

const run = {
  id: RUN_ID,
  horizon_days: 7,
  status: 'pending',
  requested_at: '2026-09-23T11:00:00Z',
  started_at: null,
  completed_at: null,
  failed_at: null,
  cancelled_at: null,
  failure_reason: null,
  total_products: 1,
  total_sales_records: 4,
  created_at: '2026-09-23T11:00:00Z',
  updated_at: '2026-09-23T11:00:00Z',
};

function service() {
  return createHttpForecastRunService(
    new ApiClient({
      baseUrl: TEST_API_BASE_URL,
      getAccessToken: () => 'contract-access-token',
    }),
  );
}

describe('Forecast Run HTTP contract', () => {
  it('uses the real create/enqueue/poll/reconcile API sequence with backend envelopes', async () => {
    let createObserved = false;
    let enqueueObserved = false;
    let pollObserved = false;
    let reconcileObserved = false;

    server.use(
      http.post(`${TEST_API_BASE_URL}/api/v1/forecast-runs`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer contract-access-token',
        );
        expect(await request.json()).toEqual({ horizon_days: 7 });
        expect(new URL(request.url).search).toBe('');
        createObserved = true;
        return HttpResponse.json({ success: true, data: { run } }, { status: 201 });
      }),
      http.post(
        `${TEST_API_BASE_URL}/api/v1/jobs/forecast-runs/${RUN_ID}`,
        ({ request }) => {
          expect(request.headers.get('authorization')).toBe(
            'Bearer contract-access-token',
          );
          expect(new URL(request.url).search).toBe('');
          enqueueObserved = true;
          return HttpResponse.json(
            {
              success: true,
              data: {
                job_id: JOB_ID,
                rq_job_id: `forecast-processing:${JOB_ID}`,
                forecast_run_id: RUN_ID,
                status: 'queued',
                queue_name: 'invora-forecasting',
                enqueued_at: '2026-09-23T11:00:01Z',
                status_url: `/api/v1/jobs/${JOB_ID}`,
              },
            },
            { status: 202 },
          );
        },
      ),
      http.get(`${TEST_API_BASE_URL}/api/v1/jobs/${JOB_ID}`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer contract-access-token',
        );
        pollObserved = true;
        return HttpResponse.json({
          success: true,
          data: {
            job: {
              job_id: JOB_ID,
              rq_job_id: `forecast-processing:${JOB_ID}`,
              job_type: 'forecast_processing',
              entity_type: 'forecast_run',
              entity_id: RUN_ID,
              status: 'finished',
            },
          },
        });
      }),
      http.get(`${TEST_API_BASE_URL}/api/v1/forecast-runs/${RUN_ID}`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(
          'Bearer contract-access-token',
        );
        reconcileObserved = true;
        return HttpResponse.json({
          success: true,
          data: { run: { ...run, status: 'completed' } },
        });
      }),
    );

    const forecastService = service();
    const created = await forecastService.startForecast({ horizonDays: 7 });
    const job = await forecastService.enqueueForecastRun(created.id);
    const terminalJob = await forecastService.getForecastJobStatus(job.id);
    const reconciled = await forecastService.getForecastRunStatus(created.id);

    expect(createObserved).toBe(true);
    expect(enqueueObserved).toBe(true);
    expect(pollObserved).toBe(true);
    expect(reconcileObserved).toBe(true);
    expect(terminalJob.status).toBe('finished');
    expect(reconciled.status).toBe('completed');
  });

  it('maps a real queue-unavailable envelope to a safe enqueue failure', async () => {
    server.use(
      http.post(`${TEST_API_BASE_URL}/api/v1/jobs/forecast-runs/${RUN_ID}`, () =>
        HttpResponse.json(
          errorEnvelope(
            'queue_unavailable',
            'Background job queue is temporarily unavailable.',
          ),
          { status: 503 },
        ),
      ),
    );

    await expect(service().enqueueForecastRun(RUN_ID)).rejects.toMatchObject({
      code: 'forecast_job_enqueue_failed',
      message: 'Background job queue is temporarily unavailable.',
    });
  });
});
