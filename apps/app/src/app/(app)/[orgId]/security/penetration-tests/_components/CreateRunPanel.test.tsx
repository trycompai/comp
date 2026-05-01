import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateRunPanel } from './CreateRunPanel';

const navigationMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigationMock.push }),
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

describe('CreateRunPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes users without allowance to billing even when required fields are empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ id: 'run_1' }));

    render(<CreateRunPanel orgId="org_1" balance={0} planRequired onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /choose plan/i }));

    await waitFor(() => {
      expect(navigationMock.push).toHaveBeenCalledWith(
        '/org_1/settings/billing/add-ons/penetration-tests',
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
