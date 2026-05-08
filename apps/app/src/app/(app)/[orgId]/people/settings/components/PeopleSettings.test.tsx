import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PeopleSettings } from './PeopleSettings';

const patchMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    patch: (...args: unknown[]) => patchMock(...args),
  },
}));
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));

describe('PeopleSettings — background-check toggle', () => {
  beforeEach(() => {
    patchMock.mockReset();
    patchMock.mockResolvedValue({ data: { success: true } });
  });

  it('shows the toggle in its current state', () => {
    render(<PeopleSettings backgroundCheckStepEnabled={true} />);
    const toggle = screen.getByRole('switch', {
      name: /require background checks/i,
    });
    expect(toggle).toBeChecked();
  });

  it('toggles off and PATCHes /v1/organization', async () => {
    const user = userEvent.setup();
    render(<PeopleSettings backgroundCheckStepEnabled={true} />);
    const toggle = screen.getByRole('switch', {
      name: /require background checks/i,
    });

    await user.click(toggle);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('/v1/organization', {
        backgroundCheckStepEnabled: false,
      });
    });
  });

  it('rolls back to checked state when PATCH fails', async () => {
    patchMock.mockResolvedValue({ error: 'server error' });
    const user = userEvent.setup();
    render(<PeopleSettings backgroundCheckStepEnabled={true} />);
    const toggle = screen.getByRole('switch', {
      name: /require background checks/i,
    });

    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });
});
