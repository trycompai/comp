import {
  ADMIN_PERMISSIONS,
  AUDITOR_PERMISSIONS,
  mockHasPermission,
  setMockPermissions,
} from '@/test-utils/mocks/permissions';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateAllowedEmails } = vi.hoisted(() => ({
  updateAllowedEmails: vi.fn(),
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    permissions: {},
    hasPermission: mockHasPermission,
  }),
}));

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({ updateAllowedEmails }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';
import { AllowedEmailsManager } from './AllowedEmailsManager';

const PLACEHOLDER = 'person@example.com';

describe('AllowedEmailsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the card title and description', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<AllowedEmailsManager initialEmails={[]} orgId="org-1" />);

    expect(screen.getByText('NDA Bypass - Allowed Emails')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Individual email addresses that bypass NDA signing for trust portal access',
      ),
    ).toBeInTheDocument();
  });

  it('renders existing emails as chips', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(
      <AllowedEmailsManager initialEmails={['chang@client.com']} orgId="org-1" />,
    );

    expect(screen.getByText('chang@client.com')).toBeInTheDocument();
  });

  it('enables the input for users with trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<AllowedEmailsManager initialEmails={[]} orgId="org-1" />);

    expect(screen.getByPlaceholderText(PLACEHOLDER)).not.toBeDisabled();
  });

  it('disables the input for read-only users', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<AllowedEmailsManager initialEmails={[]} orgId="org-1" />);

    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeDisabled();
  });

  it('saves a valid email, normalizing case and whitespace', async () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<AllowedEmailsManager initialEmails={[]} orgId="org-1" />);

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: '  Chang.Liu@Client.com  ' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), {
      key: 'Enter',
    });

    await waitFor(() =>
      expect(updateAllowedEmails).toHaveBeenCalledWith([
        'chang.liu@client.com',
      ]),
    );
    expect(toast.success).toHaveBeenCalledWith('Allowed emails updated');
  });

  it('rejects an invalid email and does not save', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<AllowedEmailsManager initialEmails={[]} orgId="org-1" />);

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: 'not-an-email' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText(PLACEHOLDER), {
      key: 'Enter',
    });

    expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    expect(updateAllowedEmails).not.toHaveBeenCalled();
  });
});
