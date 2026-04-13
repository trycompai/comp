import { act, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';
import { useIntegrationChecks } from './useIntegrationChecks';

const TASK_ID = 'tsk_test';
const ORG_ID = 'org_test';

const makeCheck = (overrides: Record<string, unknown> = {}) => ({
  integrationId: 'github',
  integrationName: 'GitHub',
  integrationLogoUrl: '/github.png',
  checkId: 'branch_protection',
  checkName: 'Branch Protection',
  checkDescription: 'Ensures branches are protected',
  isConnected: true,
  isDisabledForTask: false,
  needsConfiguration: false,
  connectionId: 'icn_1',
  connectionStatus: 'active',
  ...overrides,
});

const createJsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
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

describe('useIntegrationChecks', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const mockInitialLoad = (
    checks: ReturnType<typeof makeCheck>[],
    runs: unknown[] = [],
  ) => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/checks')) {
        return Promise.resolve(
          createJsonResponse({
            checks,
            task: { id: TASK_ID, title: 'Test', templateId: 'tpl_1' },
          }),
        );
      }
      if (url.includes('/runs')) {
        return Promise.resolve(createJsonResponse({ runs }));
      }
      return Promise.resolve(createJsonResponse({}));
    });
  };

  it('loads checks and exposes the disabled flag', async () => {
    mockInitialLoad([
      makeCheck({ checkId: 'a', isDisabledForTask: false }),
      makeCheck({ checkId: 'b', isDisabledForTask: true }),
    ]);

    const { result } = renderHook(
      () => useIntegrationChecks({ taskId: TASK_ID, orgId: ORG_ID }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.checks).toHaveLength(2);
    expect(result.current.checks[0]!.isDisabledForTask).toBe(false);
    expect(result.current.checks[1]!.isDisabledForTask).toBe(true);
  });

  it('disconnectCheckFromTask POSTs to the disconnect endpoint and updates the cache', async () => {
    mockInitialLoad([makeCheck({ checkId: 'branch_protection' })]);

    const { result } = renderHook(
      () => useIntegrationChecks({ taskId: TASK_ID, orgId: ORG_ID }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // After initial load, queue the disconnect POST response and a refetch
    // (SWR revalidates after mutate).
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/checks/disconnect')) {
        return Promise.resolve(
          createJsonResponse({ success: true, disabled: true }),
        );
      }
      if (url.includes('/checks?')) {
        return Promise.resolve(
          createJsonResponse({
            checks: [
              makeCheck({
                checkId: 'branch_protection',
                isDisabledForTask: true,
              }),
            ],
            task: { id: TASK_ID, title: 'Test', templateId: 'tpl_1' },
          }),
        );
      }
      if (url.includes('/runs')) {
        return Promise.resolve(createJsonResponse({ runs: [] }));
      }
      return Promise.resolve(createJsonResponse({}));
    });

    await act(async () => {
      await result.current.disconnectCheckFromTask(
        'icn_1',
        'branch_protection',
      );
    });

    // Verify the POST was sent
    const disconnectCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/checks/disconnect'),
    );
    expect(disconnectCall).toBeTruthy();
    const disconnectInit = disconnectCall![1] as RequestInit;
    expect(disconnectInit.method).toBe('POST');
    expect(JSON.parse(disconnectInit.body as string)).toEqual({
      connectionId: 'icn_1',
      checkId: 'branch_protection',
    });

    // Cache should reflect the updated state
    await waitFor(() =>
      expect(result.current.checks[0]!.isDisabledForTask).toBe(true),
    );
  });

  it('reconnectCheckToTask POSTs to the reconnect endpoint and updates the cache', async () => {
    mockInitialLoad([
      makeCheck({ checkId: 'branch_protection', isDisabledForTask: true }),
    ]);

    const { result } = renderHook(
      () => useIntegrationChecks({ taskId: TASK_ID, orgId: ORG_ID }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/checks/reconnect')) {
        return Promise.resolve(
          createJsonResponse({ success: true, disabled: false }),
        );
      }
      if (url.includes('/checks?')) {
        return Promise.resolve(
          createJsonResponse({
            checks: [
              makeCheck({
                checkId: 'branch_protection',
                isDisabledForTask: false,
              }),
            ],
            task: { id: TASK_ID, title: 'Test', templateId: 'tpl_1' },
          }),
        );
      }
      if (url.includes('/runs')) {
        return Promise.resolve(createJsonResponse({ runs: [] }));
      }
      return Promise.resolve(createJsonResponse({}));
    });

    await act(async () => {
      await result.current.reconnectCheckToTask('icn_1', 'branch_protection');
    });

    const reconnectCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes('/checks/reconnect'),
    );
    expect(reconnectCall).toBeTruthy();

    await waitFor(() =>
      expect(result.current.checks[0]!.isDisabledForTask).toBe(false),
    );
  });

  it('throws and rolls back optimistic updates when the disconnect request fails', async () => {
    mockInitialLoad([makeCheck({ checkId: 'branch_protection' })]);

    const { result } = renderHook(
      () => useIntegrationChecks({ taskId: TASK_ID, orgId: ORG_ID }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/checks/disconnect')) {
        return Promise.resolve(
          createJsonResponse({ message: 'Server exploded' }, 500),
        );
      }
      if (url.includes('/checks?')) {
        return Promise.resolve(
          createJsonResponse({
            checks: [makeCheck({ checkId: 'branch_protection' })],
            task: { id: TASK_ID, title: 'Test', templateId: 'tpl_1' },
          }),
        );
      }
      if (url.includes('/runs')) {
        return Promise.resolve(createJsonResponse({ runs: [] }));
      }
      return Promise.resolve(createJsonResponse({}));
    });

    await expect(
      act(async () => {
        await result.current.disconnectCheckFromTask(
          'icn_1',
          'branch_protection',
        );
      }),
    ).rejects.toThrow();

    // Cache should have rolled back
    await waitFor(() =>
      expect(result.current.checks[0]!.isDisabledForTask).toBe(false),
    );
  });
});
