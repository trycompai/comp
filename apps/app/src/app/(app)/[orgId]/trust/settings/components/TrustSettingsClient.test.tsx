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
    updateToggleSettings: vi.fn(),
    submitCustomDomain: vi.fn(),
    checkDns: vi.fn(),
    updateAllowedDomains: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

vi.mock('@/hooks/use-domain', () => ({
  useDomain: () => ({
    data: {
      data: {
        domain: 'trust.example.com',
        verified: true,
        verification: [],
        cnameTarget: '3a69a5bb27875189.vercel-dns-016.com',
        misconfigured: false,
      },
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { TrustSettingsClient } from './TrustSettingsClient';

// Mock localStorage for jsdom (TrustPortalDomain uses it)
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

describe('TrustSettingsClient permission gating', () => {
  const defaultProps = {
    orgId: 'org-1',
    contactEmail: 'admin@example.com',
    domain: 'trust.example.com',
    domainVerified: true,
    isVercelDomain: false,
    vercelVerification: null,
    allowedDomains: ['example.com'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('renders section titles regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustSettingsClient {...defaultProps} />);
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Configure Custom Domain')).toBeInTheDocument();
    expect(screen.getByText('NDA Bypass - Allowed Domains')).toBeInTheDocument();
  });

  it('enables contact email input when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustSettingsClient {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText('contact@example.com');
    expect(emailInput).not.toBeDisabled();
  });

  it('disables contact email input when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustSettingsClient {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText('contact@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('disables contact email input when user has no permissions', () => {
    setMockPermissions({});
    render(<TrustSettingsClient {...defaultProps} />);
    const emailInput = screen.getByPlaceholderText('contact@example.com');
    expect(emailInput).toBeDisabled();
  });

  it('renders domain input as disabled when user lacks trust:update permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<TrustSettingsClient {...defaultProps} />);
    const domainInput = screen.getByPlaceholderText('trust.example.com');
    expect(domainInput).toBeDisabled();
  });

  it('renders domain input as enabled when user has trust:update permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<TrustSettingsClient {...defaultProps} />);
    const domainInput = screen.getByPlaceholderText('trust.example.com');
    expect(domainInput).not.toBeDisabled();
  });

  it('renders contact email label regardless of permissions', () => {
    setMockPermissions({});
    render(<TrustSettingsClient {...defaultProps} />);
    expect(screen.getByText('Contact Email')).toBeInTheDocument();
  });
});
