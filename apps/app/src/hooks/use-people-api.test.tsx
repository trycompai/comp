import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPatch = vi.fn();

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({ patch: mockPatch }),
}));

import { usePeopleActions } from './use-people-api';

describe('usePeopleActions().updateMemberRoles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const updateMemberRoles = () =>
    renderHook(() => usePeopleActions()).result.current.updateMemberRoles;

  it('replaces the roles through PATCH /v1/people/:id', async () => {
    mockPatch.mockResolvedValue({ data: { id: 'mem_2' }, error: undefined });

    await updateMemberRoles()({ memberId: 'mem_2', roles: ['auditor', 'people-editor'] });

    expect(mockPatch).toHaveBeenCalledTimes(1);
    expect(mockPatch).toHaveBeenCalledWith('/v1/people/mem_2', {
      role: 'auditor,people-editor',
    });
  });

  it('throws the API refusal so the caller does not report success', async () => {
    mockPatch.mockResolvedValue({
      data: undefined,
      error: 'You cannot assign the role "admin" because you do not hold it',
    });

    await expect(updateMemberRoles()({ memberId: 'mem_2', roles: ['admin'] })).rejects.toThrow(
      'You cannot assign the role "admin" because you do not hold it',
    );
  });
});
