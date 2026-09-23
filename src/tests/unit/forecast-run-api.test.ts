import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FORECAST_RUN_E2E_STORAGE_KEY,
  createE2EForecastRunService,
  createHttpForecastRunService,
  createUnavailableForecastRunService,
  mapForecastJobEnqueueResponse,
  mapForecastJobResponse,
  mapForecastRunDataResponse,
  mapForecastRunResponse,
} from '@/features/forecasting/api';
import { ApiClient, type FetchLike } from '@/lib/api-client';
import {
  FORECAST_JOB_SEQUENCE,
  FORECAST_RUN_PENDING,
  FORECAST_RUN_SEQUENCE,
} from '@/tests/fixtures/forecast-run';

const RUN_WIRE = {
  id: 'f9e1382c-71d9-4c80-b296-42f19d26fc51',
  horizon_days: 15,
  status: 'pending',
  requested_at: '2026-09-23T10:00:00Z',
  started_at: null,
  completed_at: null,
  failed_at: null,
  cancelled_at: null,
  failure_reason: null,
  total_products: 2,
  total_sales_records: 31,
  created_at: '2026-09-23T10:00:00Z',
  updated_at: '2026-09-23T10:00:00Z',
} as const;

const ENQUEUE_WIRE = {
  job_id: '5a7209a5-c6d9-4b09-aa64-f622e9d2d8d4',
  rq_job_id: 'forecast-processing:5a7209a5-c6d9-4b09-aa64-f622e9d2d8d4',
  forecast_run_id: RUN_WIRE.id,
  status: 'queued',
  queue_name: 'invora-forecasting',
  enqueued_at: '2026-09-23T10:00:01Z',
  status_url: `/api/v1/jobs/5a7209a5-c6d9-4b09-aa64-f622e9d2d8d4`,
} as const;

const JOB_WIRE = {
  job_id: ENQUEUE_WIRE.job_id,
  rq_job_id: ENQUEUE_WIRE.rq_job_id,
  job_type: 'forecast_processing',
  entity_type: 'forecast_run',
  entity_id: RUN_WIRE.id,
  status: 'started',
  attempts: 1,
  max_retries: 3,
  queue_name: 'invora-forecasting',
  timeout_seconds: 1800,
  enqueued_at: ENQUEUE_WIRE.enqueued_at,
  started_at: '2026-09-23T10:00:02Z',
  completed_at: null,
  failed_at: null,
  cancelled_at: null,
  error_code: null,
  error_message: null,
  result_summary: null,
  metadata: null,
  created_at: ENQUEUE_WIRE.enqueued_at,
  updated_at: '2026-09-23T10:00:02Z',
} as const;

function successResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  window.sessionStorage.clear();
});

describe('Forecast Run service adapters', () => {
  it('maps the verified run and Background Job DTOs without exposing queue internals', () => {
    expect(mapForecastRunResponse(RUN_WIRE)).toMatchObject({
      id: RUN_WIRE.id,
      horizonDays: 15,
      totalSalesRecords: 31,
    });
    expect(mapForecastRunDataResponse({ run: RUN_WIRE })).toMatchObject({
      status: 'pending',
    });
    expect(mapForecastJobEnqueueResponse(ENQUEUE_WIRE)).toEqual({
      id: ENQUEUE_WIRE.job_id,
      runId: RUN_WIRE.id,
      status: 'queued',
    });
    expect(mapForecastJobResponse({ job: JOB_WIRE })).toEqual({
      id: ENQUEUE_WIRE.job_id,
      runId: RUN_WIRE.id,
      status: 'started',
    });
  });

  it('rejects malformed lifecycle data safely', () => {
    expect(() =>
      mapForecastRunDataResponse({ run: { ...RUN_WIRE, status: 'done' } }),
    ).toThrow('Unable to read forecast run status.');
    expect(() =>
      mapForecastJobResponse({ job: { ...JOB_WIRE, entity_type: null } }),
    ).toThrow('Unable to refresh forecast processing status.');
  });

  it('uses the exact create, enqueue, poll, and reconciliation routes through the shared client', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/api/v1/forecast-runs')) {
        expect(init.method).toBe('POST');
        expect(new Headers(init.headers).get('Authorization')).toBe(
          'Bearer access-token',
        );
        expect(JSON.parse(String(init.body))).toEqual({ horizon_days: 15 });
        return successResponse({ run: RUN_WIRE });
      }
      if (url.endsWith(`/api/v1/jobs/forecast-runs/${RUN_WIRE.id}`)) {
        expect(init.method).toBe('POST');
        expect(init.body).toBeUndefined();
        return successResponse(ENQUEUE_WIRE);
      }
      if (url.endsWith(`/api/v1/jobs/${ENQUEUE_WIRE.job_id}`)) {
        expect(init.method).toBe('GET');
        return successResponse({ job: JOB_WIRE });
      }
      if (url.endsWith(`/api/v1/forecast-runs/${RUN_WIRE.id}`)) {
        expect(init.method).toBe('GET');
        return successResponse({ run: { ...RUN_WIRE, status: 'completed' } });
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const client = new ApiClient({
      baseUrl: 'https://api.example.test',
      fetchImpl,
      getAccessToken: () => 'access-token',
    });
    const service = createHttpForecastRunService(client);

    const run = await service.startForecast({ horizonDays: 15 });
    const job = await service.enqueueForecastRun(run.id);
    const activeJob = await service.getForecastJobStatus(job.id);
    const reconciledRun = await service.getForecastRunStatus(run.id);

    expect(run.status).toBe('pending');
    expect(job.status).toBe('queued');
    expect(activeJob.status).toBe('started');
    expect(reconciledRun.status).toBe('completed');
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('surfaces queue failure safely and never falls back to synchronous processing', async () => {
    const fetchImpl = vi.fn<FetchLike>(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/v1/forecast-runs')) {
        return successResponse({ run: RUN_WIRE });
      }
      if (url.endsWith(`/api/v1/jobs/forecast-runs/${RUN_WIRE.id}`)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'queue_unavailable',
              message: 'Background job queue is temporarily unavailable.',
            },
          }),
          { status: 503, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected request: ${url}`);
    });
    const service = createHttpForecastRunService(
      new ApiClient({ baseUrl: 'https://api.example.test', fetchImpl }),
    );

    const run = await service.startForecast({ horizonDays: 15 });
    await expect(service.enqueueForecastRun(run.id)).rejects.toMatchObject({
      code: 'forecast_job_enqueue_failed',
      message: 'Background job queue is temporarily unavailable.',
    });
    expect(fetchImpl.mock.calls.map(([input]) => String(input))).not.toContain(
      `https://api.example.test/api/v1/forecast-runs/${RUN_WIRE.id}/process`,
    );
  });

  it('keeps the normal unavailable seam explicit for isolated tests', async () => {
    const service = createUnavailableForecastRunService();

    await expect(service.startForecast({ horizonDays: 7 })).rejects.toMatchObject({
      code: 'forecast_runs_unavailable',
    });
    await expect(service.enqueueForecastRun('run-id')).rejects.toMatchObject({
      code: 'forecast_job_enqueue_failed',
    });
    await expect(service.getForecastJobStatus('job-id')).rejects.toMatchObject({
      code: 'forecast_job_status_unavailable',
    });
  });

  it('reads an isolated Forecast Run and Job lifecycle only in the E2E adapter', async () => {
    window.sessionStorage.setItem(
      FORECAST_RUN_E2E_STORAGE_KEY,
      JSON.stringify({
        state: 'sequence',
        runs: FORECAST_RUN_SEQUENCE,
        jobs: FORECAST_JOB_SEQUENCE,
      }),
    );
    const service = createE2EForecastRunService();

    const run = await service.startForecast({ horizonDays: 15 });
    const job = await service.enqueueForecastRun(run.id);
    await expect(service.getForecastJobStatus(job.id)).resolves.toMatchObject({
      status: 'started',
    });
    await expect(
      service.getForecastRunStatus(FORECAST_RUN_PENDING.id),
    ).resolves.toMatchObject({
      status: 'running',
    });
  });
});
