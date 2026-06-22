import { render, screen } from '@testing-library/react';
import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
} from 'react';
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

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(() => new Promise(() => undefined)),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@trycompai/design-system', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span data-testid="badge">{children}</span>,
  Button: ({
    children,
    iconLeft,
    iconRight,
    loading,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    iconLeft?: ReactNode;
    iconRight?: ReactNode;
    loading?: boolean;
  }) => (
    <button data-loading={loading || undefined} {...props}>
      {iconLeft}
      {children}
      {iconRight}
    </button>
  ),
  Card: ({ children }: HTMLAttributes<HTMLDivElement>) => <div>{children}</div>,
  CardContent: ({ children }: HTMLAttributes<HTMLDivElement>) => <div>{children}</div>,
  CardDescription: ({ children }: HTMLAttributes<HTMLParagraphElement>) => <p>{children}</p>,
  CardHeader: ({ children }: HTMLAttributes<HTMLDivElement>) => <div>{children}</div>,
  CardTitle: ({ children }: HTMLAttributes<HTMLHeadingElement>) => <h3>{children}</h3>,
  Input: (props: InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
  Spinner: () => <span data-testid="loader-icon" />,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Globe: () => <span data-testid="globe-icon" />,
  Renew: () => <span data-testid="refresh-icon" />,
  Screen: () => <span data-testid="monitor-icon" />,
}));

import { BrowserConnectionClient } from './BrowserConnectionClient';

describe('BrowserConnectionClient permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Connect Browser button when user has integration:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<BrowserConnectionClient organizationId="org-1" />);

    const connectButton = screen.getByRole('button', { name: /connect browser/i });
    expect(connectButton).toBeInTheDocument();
    expect(connectButton).not.toBeDisabled();
  });

  it('hides Connect Browser button when user lacks integration:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<BrowserConnectionClient organizationId="org-1" />);

    expect(screen.queryByRole('button', { name: /connect browser/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open browser/i })).not.toBeInTheDocument();
  });

  it('hides Connect Browser button when user has no permissions', () => {
    setMockPermissions({});
    render(<BrowserConnectionClient organizationId="org-1" />);

    expect(screen.queryByRole('button', { name: /connect browser/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open browser/i })).not.toBeInTheDocument();
  });

  it('still shows the URL input regardless of permissions', () => {
    setMockPermissions({});
    render(<BrowserConnectionClient organizationId="org-1" />);

    expect(screen.getByLabelText('Website URL')).toBeInTheDocument();
  });
});
