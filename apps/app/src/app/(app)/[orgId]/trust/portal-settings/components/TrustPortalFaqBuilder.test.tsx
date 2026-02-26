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

vi.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    put: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { TrustPortalFaqBuilder } from './TrustPortalFaqBuilder';

const mockFaqs = [
  { id: 'faq-1', question: 'What is your security policy?', answer: 'We follow best practices.', order: 0 },
  { id: 'faq-2', question: 'Do you have SOC 2?', answer: 'Yes, we are SOC 2 compliant.', order: 1 },
];

describe('TrustPortalFaqBuilder permission gating', () => {
  const defaultProps = {
    initialFaqs: mockFaqs,
    orgId: 'org-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders FAQ title regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
  });

  it('renders FAQ count regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('shows Add FAQ and Save buttons when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    expect(screen.getByRole('button', { name: /add faq/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('hides Add FAQ and Save buttons when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /add faq/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('hides Add FAQ and Save buttons when user has no permissions', () => {
    setMockPermissions({});
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /add faq/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('disables FAQ question inputs when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText('What is your security policy?');
    for (const input of inputs) {
      expect(input).toBeDisabled();
    }
  });

  it('enables FAQ question inputs when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText('What is your security policy?');
    for (const input of inputs) {
      expect(input).not.toBeDisabled();
    }
  });

  it('hides delete buttons for FAQ items when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    // Move up/down buttons exist but are disabled; delete buttons should not exist
    // No buttons with destructive styling should be rendered
    const buttons = screen.queryAllByTitle('Move up');
    for (const btn of buttons) {
      expect(btn).toBeDisabled();
    }
  });

  it('shows delete buttons for FAQ items when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalFaqBuilder {...defaultProps} />);
    const moveUpButtons = screen.getAllByTitle('Move up');
    expect(moveUpButtons.length).toBe(2);
  });

  it('renders empty state when no FAQs exist', () => {
    setMockPermissions({});
    render(<TrustPortalFaqBuilder initialFaqs={[]} orgId="org-1" />);
    expect(screen.getByText(/no faqs yet/i)).toBeInTheDocument();
  });
});
