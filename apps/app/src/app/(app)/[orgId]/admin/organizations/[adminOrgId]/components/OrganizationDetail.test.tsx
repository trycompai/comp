import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { OrganizationDetail } from './OrganizationDetail';

const patchMock = vi.fn();
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}));

const baseOrg = {
  id: 'org_1',
  name: 'Acme',
  logo: null,
  createdAt: new Date().toISOString(),
  onboardingCompleted: true,
  members: [],
  backgroundCheckStepEnabled: true,
};

describe('OrganizationDetail — background-check toggle', () => {
  beforeEach(() => {
    patchMock.mockReset();
    patchMock.mockResolvedValue({ data: { success: true } });
  });

  it('shows the toggle in its current state', () => {
    render(
      <OrganizationDetail
        org={baseOrg}
        currentOrgId="org_1"
        hasAccess={true}
      />,
    );

    const toggle = screen.getByRole('switch', {
      name: /require background checks/i,
    });
    expect(toggle).toBeChecked();
  });

  it('toggles off and PATCHes the new value', async () => {
    const user = userEvent.setup();

    render(
      <OrganizationDetail
        org={baseOrg}
        currentOrgId="org_1"
        hasAccess={true}
      />,
    );

    const toggle = screen.getByRole('switch', {
      name: /require background checks/i,
    });

    await user.click(toggle);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(
        '/v1/admin/organizations/org_1',
        { backgroundCheckStepEnabled: false },
      );
    });
  });

  it('rolls back to checked state when PATCH fails', async () => {
    patchMock.mockResolvedValue({ error: 'server error' });
    const user = userEvent.setup();

    render(
      <OrganizationDetail
        org={baseOrg}
        currentOrgId="org_1"
        hasAccess={true}
      />,
    );

    const toggle = screen.getByRole('switch', {
      name: /require background checks/i,
    });
    await user.click(toggle);

    await waitFor(() => {
      expect(toggle).toBeChecked();
    });
  });
});
