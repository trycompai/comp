import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RelinkButton } from './RelinkButton';

vi.mock('sonner', () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

const realtimeRunMock = vi.fn();
vi.mock('@trigger.dev/react-hooks', () => ({
  useRealtimeRun: (runId: string, opts: { accessToken?: string; enabled?: boolean }) =>
    realtimeRunMock(runId, opts),
}));

afterEach(() => {
  realtimeRunMock.mockReset();
});

describe('RelinkButton', () => {
  it('renders with the "Re-assess" label by default', () => {
    realtimeRunMock.mockReturnValue({ run: null });
    render(<RelinkButton onRelink={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /Re-assess/i }),
    ).toBeInTheDocument();
  });

  it('opens a confirm dialog before triggering', async () => {
    realtimeRunMock.mockReturnValue({ run: null });
    const onRelink = vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' });
    render(<RelinkButton onRelink={onRelink} />);
    fireEvent.click(screen.getByRole('button', { name: /Re-assess/i }));
    expect(await screen.findByText(/Re-assess linked tasks/i)).toBeInTheDocument();
    expect(onRelink).not.toHaveBeenCalled();
  });

  it('triggers when the user confirms', async () => {
    realtimeRunMock.mockReturnValue({ run: null });
    const onRelink = vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' });
    render(<RelinkButton onRelink={onRelink} />);
    fireEvent.click(screen.getByRole('button', { name: /Re-assess/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Yes, re-assess/i }));
    await waitFor(() => expect(onRelink).toHaveBeenCalled());
  });

  it('chains onAfterLink when re-link completes with links', async () => {
    realtimeRunMock.mockReturnValue({
      run: {
        status: 'COMPLETED',
        metadata: { phase: 'done', riskLinks: 2, vendorLinks: 0 },
      },
    });
    const onRelink = vi.fn().mockResolvedValue({ runId: 'r1', publicAccessToken: 't1' });
    const onAfterLink = vi.fn().mockResolvedValue(undefined);
    render(<RelinkButton onRelink={onRelink} onAfterLink={onAfterLink} />);
    fireEvent.click(screen.getByRole('button', { name: /Re-assess/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Yes, re-assess/i }));
    await waitFor(() => expect(onAfterLink).toHaveBeenCalled());
  });
});
