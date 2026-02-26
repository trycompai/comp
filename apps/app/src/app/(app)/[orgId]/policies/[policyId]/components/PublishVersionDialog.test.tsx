import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  mockHasPermission,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ orgId: 'org-1' })),
}));

// Mock usePolicyVersions hook
const mockCreateVersion = vi.fn();
vi.mock('../hooks/usePolicyVersions', () => ({
  usePolicyVersions: () => ({
    createVersion: mockCreateVersion,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { PublishVersionDialog } from './PublishVersionDialog';

describe('PublishVersionDialog', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (policy:update)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders dialog with title when open', () => {
      render(
        <PublishVersionDialog
          policyId="policy-1"
          currentVersionNumber={1}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );
      expect(screen.getByText('Create New Version')).toBeInTheDocument();
    });

    it('renders Create Version button enabled for admin', () => {
      render(
        <PublishVersionDialog
          policyId="policy-1"
          currentVersionNumber={1}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );
      const createBtn = screen.getByRole('button', {
        name: /create version/i,
      });
      expect(createBtn).toBeInTheDocument();
      expect(createBtn).not.toBeDisabled();
    });

    it('shows changelog input', () => {
      render(
        <PublishVersionDialog
          policyId="policy-1"
          currentVersionNumber={1}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );
      expect(screen.getByLabelText(/changelog/i)).toBeInTheDocument();
    });

    it('displays version number context in description', () => {
      render(
        <PublishVersionDialog
          policyId="policy-1"
          currentVersionNumber={3}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );
      expect(
        screen.getByText(/based on the published version \(v3\)/i),
      ).toBeInTheDocument();
    });
  });

  describe('auditor permissions (no update)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('renders Create Version button as disabled for auditor', () => {
      render(
        <PublishVersionDialog
          policyId="policy-1"
          currentVersionNumber={1}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );
      const createBtn = screen.getByRole('button', {
        name: /create version/i,
      });
      expect(createBtn).toBeDisabled();
    });

    it('still renders dialog title and Cancel button', () => {
      render(
        <PublishVersionDialog
          policyId="policy-1"
          currentVersionNumber={1}
          isOpen={true}
          onClose={onClose}
          onSuccess={onSuccess}
        />,
      );
      expect(screen.getByText('Create New Version')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /cancel/i }),
      ).toBeInTheDocument();
    });
  });

  describe('dialog closed state', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('does not render dialog content when closed', () => {
      render(
        <PublishVersionDialog
          policyId="policy-1"
          isOpen={false}
          onClose={onClose}
        />,
      );
      expect(
        screen.queryByText('Create New Version'),
      ).not.toBeInTheDocument();
    });
  });
});
