import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

const updateCustomFramework = vi.fn();
vi.mock('@/hooks/use-frameworks', () => ({
  useFrameworks: () => ({ updateCustomFramework }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { EditCustomFrameworkSheet } from './EditCustomFrameworkSheet';

const frameworkInstance = {
  id: 'frm_1',
  organizationId: 'org_123',
  customFrameworkId: 'cfrm_1',
  customFramework: {
    id: 'cfrm_1',
    name: 'CMMC',
    description: 'Original description',
  },
  controls: [],
} as any;

function renderSheet(overrides: Partial<Record<string, unknown>> = {}) {
  return render(
    <EditCustomFrameworkSheet
      isOpen
      onClose={vi.fn()}
      frameworkInstance={frameworkInstance}
      onUpdated={vi.fn()}
      {...overrides}
    />,
  );
}

describe('EditCustomFrameworkSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when the user lacks framework:update', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    renderSheet();
    expect(screen.queryByText('Edit Custom Framework')).not.toBeInTheDocument();
  });

  it('pre-fills the form with the current name and description', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    renderSheet();
    expect(screen.getByText('Edit Custom Framework')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CMMC')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Original description'),
    ).toBeInTheDocument();
  });

  it('submits the edited values via updateCustomFramework', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    updateCustomFramework.mockResolvedValue({});
    const onClose = vi.fn();
    const onUpdated = vi.fn();
    renderSheet({ onClose, onUpdated });

    const user = userEvent.setup();
    const nameInput = screen.getByDisplayValue('CMMC');
    await user.clear(nameInput);
    await user.type(nameInput, 'CSC/CPRT');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateCustomFramework).toHaveBeenCalledWith('frm_1', {
        name: 'CSC/CPRT',
        description: 'Original description',
      });
    });
    expect(onUpdated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
