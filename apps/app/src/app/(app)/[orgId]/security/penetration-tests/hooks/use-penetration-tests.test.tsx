import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';
import {
  useCreatePenetrationTest,
  usePenetrationTest,
  usePenetrationTestProgress,
  usePenetrationTests,
} from './use-penetration-tests';

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig
    value={{
      provider: () => new Map(),
      dedupingInterval: 0,
      shouldRetryOnError: false,
      revalidateOnFocus: false,
      refreshInterval: 0,
    }}
  >
    {children}
  </SWRConfig>
);

describe('use-penetration-tests hooks', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads reports and splits active versus completed', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse([
        {
          id: 'run_completed',
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
          status: 'completed',
          createdAt: '2025-02-01T10:00:00Z',
          updatedAt: '2025-02-01T10:00:00Z',
          error: null,
          temporalUiUrl: null,
          webhookUrl: null,
        },
        {
          id: 'run_running',
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
          status: 'running',
          createdAt: '2025-02-03T10:00:00Z',
          updatedAt: '2025-02-03T10:00:00Z',
          error: null,
          temporalUiUrl: null,
          webhookUrl: null,
        },
      ]),
    );

    const { result } = renderHook(() => usePenetrationTests('org_123'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reports).toHaveLength(2);
    expect(result.current.activeReports.map((report) => report.id)).toEqual(['run_running']);
    expect(result.current.completedReports.map((report) => report.id)).toEqual(['run_completed']);
  });

  it('uses no list call when organization id is missing', () => {
    const { result } = renderHook(() => usePenetrationTests(''), { wrapper });

    expect(result.current.reports).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces provider errors for report list endpoint failures', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse(
        {
          message: 'provider unavailable',
        },
        503,
      ),
    );

    const { result } = renderHook(() => usePenetrationTests('org_123'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toEqual(expect.any(Error));
    expect(result.current.error?.message).toBe('provider unavailable');
    expect(result.current.reports).toEqual([]);
  });

  it('loads report detail and progress while running', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse({
          id: 'run_running',
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
          status: 'running',
          createdAt: '2025-02-03T10:00:00Z',
          updatedAt: '2025-02-03T10:00:00Z',
          error: null,
          temporalUiUrl: null,
          webhookUrl: null,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          status: 'running',
          completedAgents: 1,
          totalAgents: 3,
          elapsedMs: 500,
        }),
      );

    const { result } = renderHook(() => usePenetrationTest('org_123', 'run_running'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.report?.id).toBe('run_running');

    const progress = renderHook(
      () => usePenetrationTestProgress('org_123', 'run_running', result.current.report?.status),
      { wrapper },
    );

    await waitFor(() => expect(progress.result.current.isLoading).toBe(false));
    expect(progress.result.current.progress?.status).toBe('running');
    expect(progress.result.current.progress?.completedAgents).toBe(1);
  });

  it('loads a report detail for empty id only when both identifiers are present', async () => {
    const { result } = renderHook(() => usePenetrationTest('org_123', ''), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.report).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips progress polling when report is completed', () => {
    const { result } = renderHook(() => usePenetrationTestProgress('org_123', 'run_completed', 'completed'), {
      wrapper,
    });

    expect(result.current.progress).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips progress polling while report status is unknown', () => {
    const { result } = renderHook(
      () => usePenetrationTestProgress('org_123', 'run_unknown', undefined),
      { wrapper },
    );

    expect(result.current.progress).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('creates a report and returns run id', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'run_123',
        status: 'provisioning',
      }),
    );

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
          testMode: true,
        }),
      ).resolves.toMatchObject({
        id: 'run_123',
      });
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const requestBody = JSON.parse((init.body ?? '{}') as string);
    expect(requestBody.targetUrl).toBe('https://app.example.com');
    expect(requestBody.repoUrl).toBe('https://github.com/org/repo');
    expect(requestBody.testMode).toBe(true);
    expect(requestBody.mockCheckout).toBeUndefined();
  });

  it('supports creating a report without repository URL for black-box mode', async () => {
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({
        id: 'run_black_box',
        status: 'provisioning',
      }),
    );

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
        }),
      ).resolves.toMatchObject({
        id: 'run_black_box',
      });
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const requestBody = JSON.parse((init.body ?? '{}') as string);
    expect(requestBody.targetUrl).toBe('https://app.example.com');
    expect(requestBody.repoUrl).toBeUndefined();
  });

  it('billing action failure surfaces the error after run creation', async () => {
    // First call: create pentest (success)
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: 'run_billed', status: 'provisioning' }),
    );
    // Second call: billing charge (failure via API)
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ error: 'No active pentest subscription.' }, 402),
    );

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
        }),
      ).rejects.toThrow('No active pentest subscription.');
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBe('No active pentest subscription.');
  });

  it('surfaces json provider error objects from create response', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'invalid repository URL',
        }),
        { status: 400 },
      ),
    );

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
        }),
      ).rejects.toThrow('invalid repository URL');
    });

    expect(result.current.error).toBe('invalid repository URL');
  });

  it('surfaces a request-level error when create returns non-json text', async () => {
    fetchMock.mockResolvedValueOnce(new Response('service unavailable', { status: 503 }));

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
        }),
      ).rejects.toThrow('service unavailable');
    });

    expect(result.current.error).toBe('service unavailable');
  });

  it('surfaces HTTP status error when response body has no standard error fields', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          reason: 'provider rejected payload',
        }),
        { status: 500 },
      ),
    );

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
        }),
      ).rejects.toThrow('HTTP 500: ');
    });

    expect(result.current.error).toContain('HTTP 500');
  });

  it('uses the message field from non-empty JSON error responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          message: 'Invalid report configuration',
        }),
        { status: 400 },
      ),
    );

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
        }),
      ).rejects.toThrow('Invalid report configuration');
    });

    expect(result.current.error).toBe('Invalid report configuration');
  });

  it('falls back to network error message when the transport failure is not an Error', async () => {
    fetchMock.mockRejectedValueOnce('network offline');

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
        }),
      ).rejects.toThrow('Network error');
    });

    expect(result.current.error).toBe('Network error');
  });

  it('treats empty create error payload as HTTP status based message', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 400 }));

    const { result } = renderHook(() => useCreatePenetrationTest('org_123'), { wrapper });

    await act(async () => {
      await expect(
        result.current.createReport({
          targetUrl: 'https://app.example.com',
          repoUrl: 'https://github.com/org/repo',
        }),
      ).rejects.toThrow('HTTP 400: ');
    });

    expect(result.current.error).toContain('HTTP 400');
  });

  it('returns null when report detail API response body is empty', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    const { result } = renderHook(() => usePenetrationTest('org_123', 'run_123'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.report).toBeNull();
  });
});
