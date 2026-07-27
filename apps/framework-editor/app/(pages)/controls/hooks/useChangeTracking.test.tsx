import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ControlsPageGridData } from '../types';
import { useChangeTracking, type ControlMutations } from './useChangeTracking';

const { refreshMock, toastMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock('sonner', () => ({ toast: toastMock }));

// Stable reference: the hook resets its state whenever the initialData
// identity changes, so a fresh [] per render would loop forever.
const NO_ROWS: ControlsPageGridData[] = [];

function makeRow(overrides: Partial<ControlsPageGridData> = {}): ControlsPageGridData {
  return {
    id: 'temp-1',
    name: 'New Control',
    description: '',
    controlFamily: 'Access Control',
    policyTemplates: [],
    requirements: [],
    taskTemplates: [],
    documentTypes: [],
    policyTemplatesLength: 0,
    requirementsLength: 0,
    taskTemplatesLength: 0,
    documentTypesLength: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeMutations(): ControlMutations {
  return {
    createControl: vi.fn(async () => ({ id: 'frk_ct_new' })),
    updateControl: vi.fn(async () => ({})),
    deleteControl: vi.fn(async () => ({})),
    linkRequirement: vi.fn(async () => ({})),
    linkPolicyTemplate: vi.fn(async () => ({})),
    linkTaskTemplate: vi.fn(async () => ({})),
  };
}

describe('useChangeTracking handleCommit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks creating an unlinked control when requireRequirementLink is set', async () => {
    const mutations = makeMutations();
    const { result } = renderHook(() =>
      useChangeTracking(NO_ROWS, mutations, { requireRequirementLink: true }),
    );

    act(() => {
      result.current.addRow(makeRow());
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    expect(mutations.createControl).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(
      'Some operations failed',
      expect.objectContaining({
        description: expect.stringContaining('link at least one requirement'),
      }),
    );
    // The row stays in the grid so the user can fix it instead of losing it.
    expect(result.current.isDirty).toBe(true);
    expect(result.current.data).toHaveLength(1);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('creates and links requirements, policies and tasks picked on the new row', async () => {
    const mutations = makeMutations();
    const { result } = renderHook(() =>
      useChangeTracking(NO_ROWS, mutations, { requireRequirementLink: true }),
    );

    act(() => {
      result.current.addRow(
        makeRow({
          requirements: [{ id: 'req_1', name: '10.3 - Access Review' }],
          requirementsLength: 1,
          policyTemplates: [{ id: 'pol_1', name: 'Access Policy' }],
          policyTemplatesLength: 1,
          taskTemplates: [{ id: 'task_1', name: 'Review accounts' }],
          taskTemplatesLength: 1,
        }),
      );
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    expect(mutations.createControl).toHaveBeenCalledWith({
      name: 'New Control',
      description: '',
      controlFamily: 'Access Control',
      documentTypes: [],
    });
    expect(mutations.linkRequirement).toHaveBeenCalledWith('frk_ct_new', 'req_1');
    expect(mutations.linkPolicyTemplate).toHaveBeenCalledWith('frk_ct_new', 'pol_1');
    expect(mutations.linkTaskTemplate).toHaveBeenCalledWith('frk_ct_new', 'task_1');
    // Links picked before commit stay visible after the id swap.
    expect(result.current.data[0].id).toBe('frk_ct_new');
    expect(result.current.data[0].requirements).toHaveLength(1);
    expect(result.current.isDirty).toBe(false);
    expect(refreshMock).toHaveBeenCalled();
  });

  it('allows unlinked controls when requireRequirementLink is not set (global page)', async () => {
    const mutations = makeMutations();
    const { result } = renderHook(() => useChangeTracking(NO_ROWS, mutations));

    act(() => {
      result.current.addRow(makeRow());
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    expect(mutations.createControl).toHaveBeenCalled();
    expect(result.current.isDirty).toBe(false);
    expect(refreshMock).toHaveBeenCalled();
  });

  it('reports an error instead of silently skipping rows without a name', async () => {
    const mutations = makeMutations();
    const { result } = renderHook(() => useChangeTracking(NO_ROWS, mutations));

    act(() => {
      result.current.addRow(makeRow({ name: '' }));
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    expect(mutations.createControl).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(
      'Some operations failed',
      expect.objectContaining({
        description: expect.stringContaining('name is required'),
      }),
    );
    expect(result.current.isDirty).toBe(true);
  });

  it('surfaces link failures after a successful create', async () => {
    const mutations = makeMutations();
    mutations.linkRequirement = vi.fn(async () => {
      throw new Error('link failed');
    });
    const { result } = renderHook(() =>
      useChangeTracking(NO_ROWS, mutations, { requireRequirementLink: true }),
    );

    act(() => {
      result.current.addRow(
        makeRow({
          requirements: [{ id: 'req_1', name: '10.3 - Access Review' }],
          requirementsLength: 1,
        }),
      );
    });
    await act(async () => {
      await result.current.handleCommit();
    });

    expect(result.current.data[0].id).toBe('frk_ct_new');
    expect(toastMock.error).toHaveBeenCalledWith(
      'Some operations failed',
      expect.objectContaining({
        description: expect.stringContaining('failed to link'),
      }),
    );
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
