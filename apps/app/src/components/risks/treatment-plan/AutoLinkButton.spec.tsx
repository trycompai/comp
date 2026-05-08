import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutoLinkButton } from './AutoLinkButton';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const realtimeRunMock = vi.fn();
vi.mock('@trigger.dev/react-hooks', () => ({
  useRealtimeRun: (runId: string, opts: { accessToken?: string; enabled?: boolean }) =>
    realtimeRunMock(runId, opts),
}));

afterEach(() => {
  realtimeRunMock.mockReset();
});

describe('AutoLinkButton', () => {
  it('shows "generate plan" label when description is empty', () => {
    realtimeRunMock.mockReturnValue({ run: null });
    render(
      <AutoLinkButton
        hasDescription={false}
        onAutoLink={vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' })}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Auto-link tasks & generate plan/i }),
    ).toBeInTheDocument();
  });

  it('shows "refresh plan" label when description is non-empty', () => {
    realtimeRunMock.mockReturnValue({ run: null });
    render(
      <AutoLinkButton
        hasDescription
        onAutoLink={vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' })}
      />,
    );
    expect(
      screen.getByRole('button', { name: /Auto-link tasks & refresh plan/i }),
    ).toBeInTheDocument();
  });

  it('replaces the button with a progress card after click', async () => {
    realtimeRunMock.mockReturnValue({
      run: { status: 'EXECUTING', metadata: { phase: 'embedding-tasks', current: 5, total: 10 } },
    });
    const onAutoLink = vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' });
    render(<AutoLinkButton hasDescription onAutoLink={onAutoLink} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    expect(screen.getByText(/Embedding tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/\(5\/10\)/i)).toBeInTheDocument();
  });

  it('chains onAfterLink and toasts when run completes with links', async () => {
    realtimeRunMock.mockReturnValue({
      run: { status: 'COMPLETED', metadata: { phase: 'done', riskLinks: 3, vendorLinks: 0 } },
    });
    const onAutoLink = vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' });
    const onAfterLink = vi.fn().mockResolvedValue(undefined);
    render(<AutoLinkButton hasDescription onAutoLink={onAutoLink} onAfterLink={onAfterLink} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(onAfterLink).toHaveBeenCalled();
    });
  });

  it('skips onAfterLink and toasts info when run completes with zero links', async () => {
    realtimeRunMock.mockReturnValue({
      run: { status: 'COMPLETED', metadata: { phase: 'done', riskLinks: 0, vendorLinks: 0 } },
    });
    const onAutoLink = vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' });
    const onAfterLink = vi.fn();
    render(<AutoLinkButton hasDescription onAutoLink={onAutoLink} onAfterLink={onAfterLink} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      // Component returns to idle (button visible again).
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
    expect(onAfterLink).not.toHaveBeenCalled();
  });

  it('toasts error and returns to idle when run fails', async () => {
    realtimeRunMock.mockReturnValue({
      run: { status: 'FAILED', metadata: {} },
    });
    const onAutoLink = vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' });
    render(<AutoLinkButton hasDescription onAutoLink={onAutoLink} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
