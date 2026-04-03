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

// Mock usePolicy hook
const mockRegeneratePolicy = vi.fn();
const mockGetPdfUrl = vi.fn();
vi.mock('../hooks/usePolicy', () => ({
  usePolicy: () => ({
    regeneratePolicy: mockRegeneratePolicy,
    getPdfUrl: mockGetPdfUrl,
  }),
  policyKey: vi.fn(),
}));

// Mock usePolicyVersions key
vi.mock('../hooks/usePolicyVersions', () => ({
  policyVersionsKey: vi.fn(),
}));

// Mock useAuditLogs key
vi.mock('../hooks/useAuditLogs', () => ({
  auditLogsKey: vi.fn(),
}));

// Mock useSWRConfig
vi.mock('swr', () => ({
  useSWRConfig: () => ({
    mutate: vi.fn(),
  }),
}));

// Mock useRealtimeRun from trigger.dev
vi.mock('@trigger.dev/react-hooks', () => ({
  useRealtimeRun: () => ({ run: null }),
}));

// Mock pdf-generator
vi.mock('@/lib/pdf-generator', () => ({
  generatePolicyPDF: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { PolicyHeaderActions } from './PolicyHeaderActions';

const basePolicy = {
  id: 'policy-1',
  name: 'Test Policy',
  organizationId: 'org-1',
  status: 'draft',
  content: [{ type: 'paragraph', content: [] }],
  description: null,
  isArchived: false,
  departmentId: null,
  frequency: null,
  approverId: null,
  currentVersionId: 'v1',
  pendingVersionId: null,
  lastPublishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  approver: null,
  currentVersion: {
    id: 'v1',
    version: 1,
    content: [{ type: 'paragraph', content: [] }],
    changelog: null,
    pdfUrl: null,
    policyId: 'policy-1',
    organizationId: 'org-1',
    publishedById: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
} as any;

describe('PolicyHeaderActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (policy:update + policy:delete)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the dropdown trigger button', () => {
      render(
        <PolicyHeaderActions
          policy={basePolicy}
          organizationId="org-1"
        />,
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('auditor permissions (no update, no delete)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('returns null when user has neither policy:update nor policy:delete', () => {
      const { container } = render(
        <PolicyHeaderActions
          policy={basePolicy}
          organizationId="org-1"
        />,
      );

      expect(container.innerHTML).toBe('');
    });
  });

  describe('null policy', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('returns null when policy is null', () => {
      const { container } = render(
        <PolicyHeaderActions policy={null} organizationId="org-1" />,
      );

      expect(container.innerHTML).toBe('');
    });
  });

  describe('update-only permissions (no delete)', () => {
    beforeEach(() => {
      setMockPermissions({
        policy: ['read', 'update'],
      });
    });

    it('renders the dropdown when user has policy:update only', () => {
      render(
        <PolicyHeaderActions
          policy={basePolicy}
          organizationId="org-1"
        />,
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('delete-only permissions (no update)', () => {
    beforeEach(() => {
      setMockPermissions({
        policy: ['read', 'delete'],
      });
    });

    it('renders the dropdown when user has policy:delete only', () => {
      render(
        <PolicyHeaderActions
          policy={basePolicy}
          organizationId="org-1"
        />,
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
