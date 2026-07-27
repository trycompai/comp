import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useRequirementChangeTracking,
  type RequirementGridRow,
} from './useRequirementChangeTracking';

const { apiClientMock, refreshMock, toastMock } = vi.hoisted(() => ({
  apiClientMock: vi.fn(),
  refreshMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/app/lib/api-client', () => ({ apiClient: apiClientMock }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock('sonner', () => ({ toast: toastMock }));

// Stable reference: the hook resets its state whenever the initialData
// identity changes, so a fresh [] per render would loop forever.
const NO_ROWS: RequirementGridRow[] = [];

function makeRow(overrides: Partial<RequirementGridRow> = {}): RequirementGridRow {
  return {
    id: 'temp-1',
    name: 'New Requirement',
    identifier: '10.3',
    description: '',
    requirementFamily: 'Access Control',
    sortOrder: null,
    controlTemplates: [],
    controlTemplatesLength: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('useRequirementChangeTracking handleCommit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClientMock.mockImplementation(async (path: string) => {
      if (path === '/requirement') return { id: 'frk_rq_new' };
      return {};
    });
  });

  it('creates a new requirement and clears dirty state', async () => {
    const { result } = renderHook(() => useRequirementChangeTracking(NO_ROWS, 'frk_1'));

    act(() => {
      result.current.addRow(makeRow());
    });
    expect(result.current.isDirty).toBe(true);

    await act(async () => {
      await result.current.handleCommit();
    });

    expect(apiClientMock).toHaveBeenCalledWith(
      '/requirement',
      expect.objectContaining({ method: 'POST' }),
    );
    const createCall = apiClientMock.mock.calls.find((call) => call[0] === '/requirement');
    expect(JSON.parse(createCall![1].body)).toMatchObject({
      frameworkId: 'frk_1',
      name: 'New Requirement',
      identifier: '10.3',
      requirementFamily: 'Access Control',
    });
    expect(result.current.data[0].id).toBe('frk_rq_new');
    expect(result.current.isDirty).toBe(false);
    expect(toastMock.success).toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
  });

  it('persists control links picked on the uncommitted row', async () => {
    const { result } = renderHook(() => useRequirementChangeTracking(NO_ROWS, 'frk_1'));

    act(() => {
      result.current.addRow(
        makeRow({
          controlTemplates: [{ id: 'ct_1', name: 'Control 1' }],
          controlTemplatesLength: 1,
        }),
      );
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    expect(apiClientMock).toHaveBeenCalledWith(
      '/control-template/ct_1/requirements/frk_rq_new',
      { method: 'POST' },
    );
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(refreshMock).toHaveBeenCalled();
  });

  it('reports an error instead of silently skipping rows without a name', async () => {
    const { result } = renderHook(() => useRequirementChangeTracking(NO_ROWS, 'frk_1'));

    act(() => {
      result.current.addRow(makeRow({ name: '' }));
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    expect(apiClientMock).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(
      'Some operations failed',
      expect.objectContaining({
        description: expect.stringContaining('name is required'),
      }),
    );
    expect(result.current.isDirty).toBe(true);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('keeps failed rows dirty and does not refresh', async () => {
    apiClientMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRequirementChangeTracking(NO_ROWS, 'frk_1'));

    act(() => {
      result.current.addRow(makeRow());
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    expect(toastMock.error).toHaveBeenCalled();
    expect(result.current.isDirty).toBe(true);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('surfaces link failures after a successful create', async () => {
    apiClientMock.mockImplementation(async (path: string) => {
      if (path === '/requirement') return { id: 'frk_rq_new' };
      throw new Error('link failed');
    });
    const { result } = renderHook(() => useRequirementChangeTracking(NO_ROWS, 'frk_1'));

    act(() => {
      result.current.addRow(
        makeRow({
          controlTemplates: [{ id: 'ct_1', name: 'Control 1' }],
          controlTemplatesLength: 1,
        }),
      );
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    // The requirement exists (id swapped in) but the user is told links failed.
    expect(result.current.data[0].id).toBe('frk_rq_new');
    expect(toastMock.error).toHaveBeenCalledWith(
      'Some operations failed',
      expect.objectContaining({
        description: expect.stringContaining('failed to link'),
      }),
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
