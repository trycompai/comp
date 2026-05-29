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

const mockUseFrameworkUpdateStatuses = vi.fn();
vi.mock('@/hooks/use-framework-update-statuses', () => ({
  useFrameworkUpdateStatuses: () => mockUseFrameworkUpdateStatuses(),
}));

vi.mock('../components/FrameworkUpdatesCard', () => ({
  FrameworkUpdatesCard: () => <div>framework updates available</div>,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_123' }),
  useRouter: () => ({ push: vi.fn() }),
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
  ChevronDown: () => <span>v</span>,
  ChevronUp: () => <span>^</span>,
  ArrowRight: () => <span>→</span>,
}));

import { OverviewNudges } from './OverviewNudges';

const TRUST_PERMS = { trust: ['read', 'update'] };

function setOffboarding(members: { memberId: string; name: string }[]) {
  mockUseApiSWR.mockReturnValue({ data: { data: { members } }, error: undefined });
}

function setFrameworkUpdates(items: { frameworkInstanceId: string }[]) {
  mockUseFrameworkUpdateStatuses.mockReturnValue({ data: items, error: undefined });
}

describe('OverviewNudges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    setOffboarding([]); // default: no offboarding
    setFrameworkUpdates([]); // default: no framework updates
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

  it('collapses to the top nudge with a stack control when several apply', () => {
    setOffboarding([{ memberId: 'm1', name: 'Jo' }]);
    render(<OverviewNudges orgId="org_123" server={server()} />);
    // Offboarding (priority 10) is shown; trust waits behind the stack.
    expect(screen.getByText(/offboarding completion/)).toBeInTheDocument();
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
    // The user is told more are waiting.
    expect(screen.getByText('2 notices')).toBeInTheDocument();
  });

  it('expands the stack to reveal every waiting nudge, then collapses', () => {
    setOffboarding([{ memberId: 'm1', name: 'Jo' }]);
    render(<OverviewNudges orgId="org_123" server={server()} />);

    fireEvent.click(screen.getByText('2 notices'));
    expect(screen.getByText(/offboarding completion/)).toBeInTheDocument();
    expect(screen.getByText('Showcase your security posture')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show less'));
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
    expect(screen.getByText('2 notices')).toBeInTheDocument();
  });

  it('shows no stack control when only one nudge applies', () => {
    render(<OverviewNudges orgId="org_123" server={server()} />);
    expect(screen.getByText('Showcase your security posture')).toBeInTheDocument();
    expect(screen.queryByText(/\d+ notices/)).not.toBeInTheDocument();
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

  it('shows the framework updates nudge when it is the only one eligible', () => {
    setFrameworkUpdates([{ frameworkInstanceId: 'fi_1' }]);
    // isConfigured: true → trust off; no offboarding → framework is the only nudge.
    render(<OverviewNudges orgId="org_123" server={server({ isConfigured: true })} />);
    expect(screen.getByText('framework updates available')).toBeInTheDocument();
    expect(screen.queryByText(/\d+ notices/)).not.toBeInTheDocument();
  });

  it('orders framework updates last in the stack (offboarding, trust, framework)', () => {
    setOffboarding([{ memberId: 'm1', name: 'Jo' }]);
    setFrameworkUpdates([{ frameworkInstanceId: 'fi_1' }]);
    render(<OverviewNudges orgId="org_123" server={server()} />);

    // Collapsed: only offboarding (priority 10) on top; the other two wait.
    expect(screen.getByText(/offboarding completion/)).toBeInTheDocument();
    expect(screen.queryByText('framework updates available')).not.toBeInTheDocument();
    expect(screen.queryByText('Showcase your security posture')).not.toBeInTheDocument();
    expect(screen.getByText('3 notices')).toBeInTheDocument();

    // Expanded: all three shown, framework updates rendered after the trust nudge.
    fireEvent.click(screen.getByText('3 notices'));
    expect(screen.getByText(/offboarding completion/)).toBeInTheDocument();
    const trustEl = screen.getByText('Showcase your security posture');
    const frameworkEl = screen.getByText('framework updates available');
    expect(
      trustEl.compareDocumentPosition(frameworkEl) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('excludes framework updates from the count while its data is loading', () => {
    setOffboarding([{ memberId: 'm1', name: 'Jo' }]);
    mockUseFrameworkUpdateStatuses.mockReturnValue({ data: undefined, error: undefined });
    render(<OverviewNudges orgId="org_123" server={server()} />);
    // offboarding + trust = 2; framework not ready, so it doesn't inflate the count.
    expect(screen.getByText('2 notices')).toBeInTheDocument();
  });
});
