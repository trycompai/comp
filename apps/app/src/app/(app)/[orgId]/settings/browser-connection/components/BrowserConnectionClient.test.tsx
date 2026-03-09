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

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: { hasContext: false } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

vi.mock('@comp/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));

vi.mock('@comp/ui/button', () => ({
  Button: ({ children, disabled, onClick, ...props }: any) => (
    <button disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@comp/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('@comp/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@comp/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock('lucide-react', () => ({
  Globe: () => <span data-testid="globe-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  MonitorSmartphone: () => <span data-testid="monitor-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
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
