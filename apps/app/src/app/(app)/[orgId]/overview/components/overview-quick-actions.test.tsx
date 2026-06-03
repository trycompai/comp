import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePublishAllPoliciesAction } from './overview-quick-actions';

const { mockRefresh } = vi.hoisted(() => ({
  mockRefresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/policies/PolicyAcknowledgmentInvalidationDialog', () => ({
  getPolicyAcknowledgmentTotal: (policies: Array<{ signedBy?: string[] }>) =>
    policies.reduce((total, policy) => total + (policy.signedBy?.length ?? 0), 0),
  PolicyAcknowledgmentInvalidationDialog: () => null,
}));

function PublishAllButton() {
  const { handlePublishAllClick, isPublishing } = usePublishAllPoliciesAction({
    unpublishedPolicies: [{ signedBy: [] }],
  });

  return (
    <button disabled={isPublishing} onClick={handlePublishAllClick}>
      Publish All Policies
    </button>
  );
}

describe('usePublishAllPoliciesAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks duplicate no-warning publishes while the request is in flight', async () => {
    const user = userEvent.setup();
    let resolveFetch: () => void = () => {};
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = () => resolve(new Response(null, { status: 200 }));
    });
    const fetchMock = vi.fn(() => fetchPromise);
    vi.stubGlobal('fetch', fetchMock);

    render(<PublishAllButton />);

    const publishButton = screen.getByRole('button', { name: /publish all policies/i });
    await user.dblClick(publishButton);

    expect(fetchMock).toHaveBeenCalledOnce();
    await waitFor(() => expect(publishButton).toBeDisabled());

    resolveFetch();

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledOnce());
    await waitFor(() => expect(publishButton).not.toBeDisabled());
  });
});
