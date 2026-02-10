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

// Mock usePolicyActions
const mockRegenerateAll = vi.fn();
vi.mock('../hooks/usePolicyActions', () => ({
  usePolicyActions: () => ({
    regenerateAll: mockRegenerateAll,
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { FullPolicyHeaderActions } from './FullPolicyHeaderActions';

describe('FullPolicyHeaderActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('admin permissions (policy:update)', () => {
    beforeEach(() => {
      setMockPermissions(ADMIN_PERMISSIONS);
    });

    it('renders the settings dropdown trigger', () => {
      const { container } = render(<FullPolicyHeaderActions />);

      // The component renders a dropdown trigger button
      expect(container.innerHTML).not.toBe('');
      expect(
        screen.getByRole('button'),
      ).toBeInTheDocument();
    });
  });

  describe('auditor permissions (no policy:update)', () => {
    beforeEach(() => {
      setMockPermissions(AUDITOR_PERMISSIONS);
    });

    it('returns null when user lacks policy:update', () => {
      const { container } = render(<FullPolicyHeaderActions />);

      expect(container.innerHTML).toBe('');
    });
  });

  describe('no permissions', () => {
    beforeEach(() => {
      setMockPermissions({});
    });

    it('returns null when user has no permissions', () => {
      const { container } = render(<FullPolicyHeaderActions />);

      expect(container.innerHTML).toBe('');
    });
  });
});
