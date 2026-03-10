import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  setMockPermissions,
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
} from '@/test-utils/mocks/permissions';

// Mock usePermissions
vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

// Mock useApi
vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    post: vi.fn(),
  }),
}));

// Mock useSWRConfig
vi.mock('swr', () => ({
  useSWRConfig: () => ({
    mutate: vi.fn(),
  }),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { TransferOwnership } from './transfer-ownership';

const mockMembers = [
  { id: 'member_1', user: { name: 'Alice', email: 'alice@test.com' } },
  { id: 'member_2', user: { name: null, email: 'bob@test.com' } },
];

// Owner permissions include organization:delete; admin does not
const OWNER_PERMISSIONS = {
  ...ADMIN_PERMISSIONS,
  organization: ['read', 'update', 'delete'],
};

describe('TransferOwnership permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when user is not the owner', () => {
    setMockPermissions(OWNER_PERMISSIONS);

    const { container } = render(
      <TransferOwnership members={mockMembers} isOwner={false} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when user lacks organization:delete permission (admin role)', () => {
    setMockPermissions(ADMIN_PERMISSIONS);

    const { container } = render(
      <TransferOwnership members={mockMembers} isOwner={true} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when user lacks organization:delete permission (auditor role)', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);

    const { container } = render(
      <TransferOwnership members={mockMembers} isOwner={true} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when user has no permissions at all', () => {
    setMockPermissions({});

    const { container } = render(
      <TransferOwnership members={mockMembers} isOwner={true} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders the transfer ownership card when user is owner with organization:delete permission', () => {
    setMockPermissions(OWNER_PERMISSIONS);

    render(<TransferOwnership members={mockMembers} isOwner={true} />);

    const elements = screen.getAllByText('Transfer ownership');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the "no members" message when members array is empty and user has permission', () => {
    setMockPermissions(OWNER_PERMISSIONS);

    render(<TransferOwnership members={[]} isOwner={true} />);

    expect(
      screen.getByText(/You need to add other members/),
    ).toBeInTheDocument();
  });

  it('renders the card content when owner has permission and members exist', () => {
    setMockPermissions(OWNER_PERMISSIONS);

    render(<TransferOwnership members={mockMembers} isOwner={true} />);

    expect(
      screen.getByText(/This action cannot be undone/),
    ).toBeInTheDocument();
  });
});
