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

vi.mock('./AddFrameworkModal', () => ({
  AddFrameworkModal: () => <div data-testid="add-framework-modal" />,
}));

vi.mock('@trycompai/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@trycompai/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_123' }),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt as string} src={props.src as string} />
  ),
}));

import { FrameworksOverview } from './FrameworksOverview';

const baseProps = {
  frameworksWithControls: [],
  allFrameworks: [],
  frameworksWithCompliance: [],
  organizationId: 'org_123',
};

describe('FrameworksOverview permission gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Add Framework" button when user has framework:create permission', () => {
    setMockPermissions(ADMIN_PERMISSIONS);
    render(<FrameworksOverview {...baseProps} />);
    expect(screen.getByRole('button', { name: /add framework/i })).toBeInTheDocument();
  });

  it('hides "Add Framework" button when user lacks framework:create permission', () => {
    setMockPermissions(AUDITOR_PERMISSIONS);
    render(<FrameworksOverview {...baseProps} />);
    expect(screen.queryByRole('button', { name: /add framework/i })).not.toBeInTheDocument();
  });

  it('hides "Add Framework" button when user has no permissions', () => {
    setMockPermissions({});
    render(<FrameworksOverview {...baseProps} />);
    expect(screen.queryByRole('button', { name: /add framework/i })).not.toBeInTheDocument();
  });

  it('renders PCI DSS badge for PCI DSS Level 1 framework instances', () => {
    setMockPermissions({});

    render(
      <FrameworksOverview
        {...baseProps}
        overallComplianceScore={0}
        frameworksWithControls={[
          {
            id: 'fi_pci_level_1',
            controls: [],
            framework: {
              id: 'fw_pci_level_1',
              name: 'PCI DSS Level 1',
              description: 'Payment Card Industry Data Security Standard Level 1',
            },
          } as any,
        ]}
      />,
    );

    const badge = screen.getByAltText('PCI DSS Level 1');
    expect(badge).toHaveAttribute('src', '/badges/pci-dss.svg');
  });

  it('renders PCI DSS badge for PCI DSS framework name variants', () => {
    setMockPermissions({});

    render(
      <FrameworksOverview
        {...baseProps}
        overallComplianceScore={0}
        frameworksWithControls={[
          {
            id: 'fi_pci_variant',
            controls: [],
            framework: {
              id: 'fw_pci_variant',
              name: 'PCI DSS v4.0 Level 1',
              description: 'PCI DSS framework variant',
            },
          } as any,
        ]}
      />,
    );

    const badge = screen.getByAltText('PCI DSS v4.0 Level 1');
    expect(badge).toHaveAttribute('src', '/badges/pci-dss.svg');
  });
});
