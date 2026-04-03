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
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  })),
  useParams: vi.fn(() => ({ orgId: 'org-1' })),
}));

// Mock usePolicy hook
const mockDeletePolicy = vi.fn();
vi.mock('../hooks/usePolicy', () => ({
  usePolicy: () => ({
    deletePolicy: mockDeletePolicy,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { PolicyDeleteDialog } from './PolicyDeleteDialog';

const basePolicy = {
  id: 'policy-1',
  name: 'Test Policy',
  organizationId: 'org-1',
  status: 'draft',
  content: null,
  description: null,
  isArchived: false,
  departmentId: null,
  department: null,
  frequency: null,
  approverId: null,
  assigneeId: null,
  currentVersionId: null,
  pendingVersionId: null,
  lastPublishedAt: null,
  reviewDate: null,
  pdfUrl: null,
  displayFormat: 'EDITOR',
  draftContent: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as any;

describe('PolicyDeleteDialog', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (policy:delete)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the dialog with title and description when open', () => {
      render(
        <PolicyDeleteDialog
          isOpen={true}
          onClose={onClose}
          policy={basePolicy}
        />,
      );
      expect(screen.getByText('Delete Policy')).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to delete this policy/i),
      ).toBeInTheDocument();
    });

    it('renders Delete button enabled for admin', () => {
      render(
        <PolicyDeleteDialog
          isOpen={true}
          onClose={onClose}
          policy={basePolicy}
        />,
      );
      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn).not.toBeDisabled();
    });

    it('renders Cancel button', () => {
      render(
        <PolicyDeleteDialog
          isOpen={true}
          onClose={onClose}
          policy={basePolicy}
        />,
      );
      expect(
        screen.getByRole('button', { name: /cancel/i }),
      ).toBeInTheDocument();
    });
  });

  describe('auditor permissions (no delete)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('renders Delete button as disabled for auditor', () => {
      render(
        <PolicyDeleteDialog
          isOpen={true}
          onClose={onClose}
          policy={basePolicy}
        />,
      );
      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      expect(deleteBtn).toBeDisabled();
    });

    it('still renders dialog title and description for auditor', () => {
      render(
        <PolicyDeleteDialog
          isOpen={true}
          onClose={onClose}
          policy={basePolicy}
        />,
      );
      expect(screen.getByText('Delete Policy')).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to delete this policy/i),
      ).toBeInTheDocument();
    });
  });

  describe('dialog closed state', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('does not render dialog content when closed', () => {
      render(
        <PolicyDeleteDialog
          isOpen={false}
          onClose={onClose}
          policy={basePolicy}
        />,
      );
      expect(screen.queryByText('Delete Policy')).not.toBeInTheDocument();
    });
  });
});
