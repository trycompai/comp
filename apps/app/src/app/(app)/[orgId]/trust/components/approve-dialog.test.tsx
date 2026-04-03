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

const mockApproveRequest = vi.fn();
vi.mock('@/hooks/use-access-requests', () => ({
  useAccessRequest: () => ({
    data: {
      id: 'req-1',
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Acme Inc',
      jobTitle: 'Engineer',
      purpose: 'Review security docs',
      requestedDurationDays: 30,
    },
  }),
  useApproveAccessRequest: () => ({
    mutateAsync: mockApproveRequest,
  }),
}));

vi.mock('./duration-picker', () => ({
  DurationPicker: ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <input
      data-testid="duration-picker"
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  ),
}));

vi.mock('sonner', () => ({
  toast: { promise: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { ApproveDialog } from './approve-dialog';

describe('ApproveDialog permission gating', () => {
  const defaultProps = {
    orgId: 'org-1',
    requestId: 'req-1',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog with request details regardless of permissions', () => {
    setMockPermissions({});
    render(<ApproveDialog {...defaultProps} />);
    expect(screen.getByText('Approve Access Request')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('enables the submit button when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<ApproveDialog {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /approve & send nda/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('disables the submit button when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<ApproveDialog {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /approve & send nda/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables the submit button when user has no permissions', () => {
    setMockPermissions({});
    render(<ApproveDialog {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /approve & send nda/i });
    expect(submitButton).toBeDisabled();
  });

  it('always renders the cancel button regardless of permissions', () => {
    setMockPermissions({});
    render(<ApproveDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
