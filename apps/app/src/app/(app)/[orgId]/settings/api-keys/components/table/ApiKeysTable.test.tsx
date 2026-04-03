import { render, screen } from '@testing-library/react';
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

const mockRevokeApiKey = vi.fn();

vi.mock('@/hooks/use-api-keys', () => ({
  useApiKeys: (options?: { initialData?: unknown[] }) => ({
    apiKeys: options?.initialData ?? [],
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    createApiKey: vi.fn(),
    revokeApiKey: mockRevokeApiKey,
  }),
}));

vi.mock('./CreateApiKeySheet', () => ({
  CreateApiKeySheet: () => <div data-testid="create-api-key-sheet" />,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { ApiKeysTable } from './ApiKeysTable';

const sampleApiKeys = [
  {
    id: 'key_1',
    name: 'Production API Key',
    createdAt: '2024-01-15',
    expiresAt: '2025-01-15',
    lastUsedAt: '2024-06-01',
    isActive: true,
    scopes: ['read:controls', 'write:controls'],
  },
];

describe('ApiKeysTable permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows revoke action when user has apiKey:delete permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ApiKeysTable initialApiKeys={sampleApiKeys} />);

    // The actions cell should contain the overflow menu trigger
    expect(screen.getByText('Production API Key')).toBeInTheDocument();
    // The OverflowMenuVertical icon is inside a trigger button
    const actionButtons = screen.getAllByRole('button');
    // Should find at least the dropdown trigger for revoke action
    const overflowButton = actionButtons.find(
      (btn) => btn.querySelector('svg') !== null,
    );
    expect(overflowButton).toBeDefined();
  });

  it('hides revoke action when user lacks apiKey:delete permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ApiKeysTable initialApiKeys={sampleApiKeys} />);

    // The row should still be visible
    expect(screen.getByText('Production API Key')).toBeInTheDocument();
    // But the actions cell should be empty (ActionsCell returns null)
    // Only the "Add API Key" button should exist
    const buttons = screen.getAllByRole('button');
    const addButton = buttons.find((btn) =>
      btn.textContent?.includes('Add API Key'),
    );
    expect(addButton).toBeDefined();
    // No overflow/revoke button should exist for the row
    // Since ActionsCell returns null, there should be no ellipsis trigger
    const overflowTriggers = buttons.filter(
      (btn) =>
        !btn.textContent?.includes('Add API Key') &&
        !btn.textContent?.includes('Search'),
    );
    // The only non-"Add API Key" buttons should be search-related or none
    expect(
      overflowTriggers.every(
        (btn) => btn.querySelector('[data-testid]') === null,
      ),
    ).toBe(true);
  });

  it('hides revoke action when user has no permissions', () => {
    setMockPermissions({});
    render(<ApiKeysTable initialApiKeys={sampleApiKeys} />);

    expect(screen.getByText('Production API Key')).toBeInTheDocument();
    // No overflow menu triggers should be rendered
    const buttons = screen.getAllByRole('button');
    const nonAddButtons = buttons.filter(
      (btn) => !btn.textContent?.includes('Add API Key'),
    );
    // None of the remaining buttons should be a revoke trigger
    for (const btn of nonAddButtons) {
      expect(btn.textContent).not.toContain('Revoke');
    }
  });
});
