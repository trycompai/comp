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
const mockArchivePolicy = vi.fn();
vi.mock('../hooks/usePolicy', () => ({
  usePolicy: () => ({
    archivePolicy: mockArchivePolicy,
  }),
}));

// Mock nuqs
vi.mock('nuqs', () => ({
  useQueryState: vi.fn(() => ['true', vi.fn()]),
}));

// Mock media query hook
vi.mock('@comp/ui/hooks', () => ({
  useMediaQuery: vi.fn(() => true),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { PolicyArchiveSheet } from './PolicyArchiveSheet';

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

describe('PolicyArchiveSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (policy:update)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the Archive button enabled for admin', () => {
      render(<PolicyArchiveSheet policy={basePolicy} />);
      const archiveBtn = screen.getByRole('button', { name: /archive/i });
      expect(archiveBtn).toBeInTheDocument();
      expect(archiveBtn).not.toBeDisabled();
    });

    it('renders Restore button when policy is archived', () => {
      const archivedPolicy = { ...basePolicy, isArchived: true };
      render(<PolicyArchiveSheet policy={archivedPolicy} />);
      const restoreBtn = screen.getByRole('button', { name: /restore/i });
      expect(restoreBtn).toBeInTheDocument();
      expect(restoreBtn).not.toBeDisabled();
    });

    it('shows the sheet title "Archive Policy" for non-archived policy', () => {
      render(<PolicyArchiveSheet policy={basePolicy} />);
      expect(screen.getByText('Archive Policy')).toBeInTheDocument();
    });

    it('shows the sheet title "Restore Policy" for archived policy', () => {
      const archivedPolicy = { ...basePolicy, isArchived: true };
      render(<PolicyArchiveSheet policy={archivedPolicy} />);
      expect(screen.getByText('Restore Policy')).toBeInTheDocument();
    });
  });

  describe('auditor permissions (no update)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('renders the Archive button as disabled for auditor', () => {
      render(<PolicyArchiveSheet policy={basePolicy} />);
      const archiveBtn = screen.getByRole('button', { name: /archive/i });
      expect(archiveBtn).toBeDisabled();
    });

    it('renders the Restore button as disabled for auditor on archived policy', () => {
      const archivedPolicy = { ...basePolicy, isArchived: true };
      render(<PolicyArchiveSheet policy={archivedPolicy} />);
      const restoreBtn = screen.getByRole('button', { name: /restore/i });
      expect(restoreBtn).toBeDisabled();
    });
  });
});
