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

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({
    submitCustomDomain: vi.fn(),
    checkDns: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-domain', () => ({
  DEFAULT_CNAME_TARGET: 'cname.vercel-dns.com',
  useDomain: () => ({
    data: {
      data: {
        domain: 'trust.example.com',
        verified: false,
        verification: [],
        cnameTarget: 'cname.vercel-dns.com',
      },
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { TrustPortalDomain } from './TrustPortalDomain';

// Mock localStorage for jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('TrustPortalDomain permission gating', () => {
  const defaultProps = {
    domain: 'trust.example.com',
    domainVerified: true,
    isVercelDomain: false,
    vercelVerification: null,
    orgId: 'org-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders title and description regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalDomain {...defaultProps} />);
    expect(screen.getByText('Configure Custom Domain')).toBeInTheDocument();
  });

  it('enables the domain input when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalDomain {...defaultProps} />);
    const input = screen.getByPlaceholderText('trust.example.com');
    expect(input).not.toBeDisabled();
  });

  it('disables the domain input when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalDomain {...defaultProps} />);
    const input = screen.getByPlaceholderText('trust.example.com');
    expect(input).toBeDisabled();
  });

  it('disables the domain input when user has no permissions', () => {
    setMockPermissions({});
    render(<TrustPortalDomain {...defaultProps} />);
    const input = screen.getByPlaceholderText('trust.example.com');
    expect(input).toBeDisabled();
  });

  it('enables the Save button when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustPortalDomain {...defaultProps} />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('disables the Save button when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustPortalDomain {...defaultProps} />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('renders Custom Domain label regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustPortalDomain {...defaultProps} />);
    expect(screen.getByText('Custom Domain')).toBeInTheDocument();
  });
});
