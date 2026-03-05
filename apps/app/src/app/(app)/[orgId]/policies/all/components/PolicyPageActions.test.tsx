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

// Mock CreatePolicySheet — renders nothing
vi.mock('@/components/sheets/create-policy-sheet', () => ({
  CreatePolicySheet: () => <div data-testid="create-policy-sheet" />,
}));

// Mock pdf-generator
vi.mock('@/lib/pdf-generator', () => ({
  downloadAllPolicies: vi.fn(),
}));

// Mock api client
vi.mock('@/lib/api-client', () => ({
  api: { get: vi.fn() },
}));

import { PolicyPageActions } from './PolicyPageActions';

const basePolicies = [
  {
    id: 'p1',
    name: 'Security Policy',
    organizationId: 'org-1',
    status: 'draft',
    content: null,
    description: null,
    isArchived: false,
    departmentId: null,
    frequency: null,
    approverId: null,
    currentVersionId: null,
    pendingVersionId: null,
    lastPublishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
] as any;

describe('PolicyPageActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the Create Policy button when user has policy:create', () => {
      render(<PolicyPageActions policies={basePolicies} />);

      expect(
        screen.getByRole('button', { name: /create policy/i }),
      ).toBeInTheDocument();
    });

    it('renders the Download All button when policies exist', () => {
      render(<PolicyPageActions policies={basePolicies} />);

      expect(
        screen.getByRole('button', { name: /download all/i }),
      ).toBeInTheDocument();
    });
  });

  describe('auditor permissions (no policy:create)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('does not render the Create Policy button', () => {
      render(<PolicyPageActions policies={basePolicies} />);

      expect(
        screen.queryByRole('button', { name: /create policy/i }),
      ).not.toBeInTheDocument();
    });

    it('still renders the Download All button', () => {
      render(<PolicyPageActions policies={basePolicies} />);

      expect(
        screen.getByRole('button', { name: /download all/i }),
      ).toBeInTheDocument();
    });
  });

  describe('empty policies', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('does not render Download All when there are no policies', () => {
      render(<PolicyPageActions policies={[]} />);

      expect(
        screen.queryByRole('button', { name: /download all/i }),
      ).not.toBeInTheDocument();
    });

    it('still renders Create Policy when there are no policies', () => {
      render(<PolicyPageActions policies={[]} />);

      expect(
        screen.getByRole('button', { name: /create policy/i }),
      ).toBeInTheDocument();
    });
  });
});
