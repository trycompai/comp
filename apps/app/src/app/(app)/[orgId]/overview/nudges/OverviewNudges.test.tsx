import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockHasPermission, setMockPermissions } from '@/test-utils/mocks/permissions';

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ permissions: {}, hasPermission: mockHasPermission }),
}));

const mockUseApiSWR = vi.fn();
vi.mock('@/hooks/use-api-swr', () => ({
  useApiSWR: () => mockUseApiSWR(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_123' }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@trycompai/design-system', () => ({
  Alert: ({ children }: any) => <div data-testid="alert">{children}</div>,
  AlertAction: ({ children }: any) => <div>{children}</div>,
  AlertTitle: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
  Button: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@trycompai/design-system/icons', () => ({
  Close: () => <span>x</span>,
  WarningAlt: () => <span>!</span>,
}));

import { OverviewNudges } from './OverviewNudges';

const TRUST_PERMS = { trust: ['read', 'update'] };

function setOffboarding(members: { memberId: string; name: string }[]) {
  mockUseApiSWR.mockReturnValue({ data: { data: { members } }, error: undefined });
}

describe('OverviewNudges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    setOffboarding([]); // default: no offboarding
    setMockPermissions(TRUST_PERMS);
  });

  const server = (over?: Partial<{ isTrustNdaEnabled: boolean; isConfigured: boolean }>) => ({
    trust: { isTrustNdaEnabled: true, isConfigured: false, ...over },
  });

  it('shows the trust nudge when enabled, not configured, and user can update', () => {
    render(<OverviewNudges orgId="org_123" server={server()} />);
    expect(screen.getByText('Showcase your security posture')).toBeInTheDocument();
  });

  it('hides the trust nudge when already configured', () => {
    render(<OverviewNudges orgId="org_123" server={server({ isConfigured: true })} />);
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
  });

  it('hides the trust nudge when the feature flag is off', () => {
    render(<OverviewNudges orgId="org_123" server={server({ isTrustNdaEnabled: false })} />);
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
  });

  it('hides the trust nudge without trust:update', () => {
    setMockPermissions({ trust: ['read'] });
    render(<OverviewNudges orgId="org_123" server={server()} />);
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
  });

  it('shows offboarding ahead of the trust nudge when both apply', () => {
    setOffboarding([{ memberId: 'm1', name: 'Jo' }]);
    render(<OverviewNudges orgId="org_123" server={server()} />);
    expect(screen.getByText(/offboarding completion/)).toBeInTheDocument();
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
  });

  it('dismissing the trust nudge hides it and persists', () => {
    const { unmount } = render(<OverviewNudges orgId="org_123" server={server()} />);
    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
    unmount();
    render(<OverviewNudges orgId="org_123" server={server()} />);
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
  });

  it('dismissing offboarding hides it for the session without persisting', () => {
    setOffboarding([{ memberId: 'm1', name: 'Jo' }]);
    // isConfigured: true so the trust nudge does not appear after offboarding is dismissed
    const { unmount } = render(
      <OverviewNudges orgId="org_123" server={server({ isConfigured: true })} />,
    );
    expect(screen.getByText(/offboarding completion/)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText(/offboarding completion/)).not.toBeInTheDocument();
    expect(
      window.localStorage.getItem('overview-nudge-dismissed:offboarding:org_123'),
    ).toBeNull();

    // Not persisted → reappears on remount.
    unmount();
    render(<OverviewNudges orgId="org_123" server={server({ isConfigured: true })} />);
    expect(screen.getByText(/offboarding completion/)).toBeInTheDocument();
  });

  it('renders nothing while offboarding is loading and trust is ineligible', () => {
    mockUseApiSWR.mockReturnValue({ data: undefined, error: undefined }); // SWR loading
    const { container } = render(
      <OverviewNudges orgId="org_123" server={server({ isConfigured: true })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
