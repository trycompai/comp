import type { TrustCustomFrameworkItem } from '@/hooks/use-trust-portal-settings';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomFrameworksSection } from './CustomFrameworksSection';

const updateCustomFramework = vi.fn();
const uploadCustomComplianceResource = vi.fn();
const getCustomComplianceResourceUrl = vi.fn();
const uploadCustomFrameworkBadge = vi.fn();
const removeCustomFrameworkBadge = vi.fn();

vi.mock('@/hooks/use-trust-portal-settings', () => ({
  useTrustPortalSettings: () => ({
    updateCustomFramework,
    uploadCustomComplianceResource,
    getCustomComplianceResourceUrl,
    uploadCustomFrameworkBadge,
    removeCustomFrameworkBadge,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const frameworks: TrustCustomFrameworkItem[] = [
  {
    customFrameworkId: 'cfrm_a',
    name: 'Acme Internal Standard',
    description: 'Our internal security standard',
    enabled: true,
    status: 'compliant',
    hasCertificate: false,
    certificateFileName: null,
    badgeUrl: null,
  },
  {
    customFrameworkId: 'cfrm_b',
    name: 'HR Security Base',
    description: 'HR controls',
    enabled: false,
    status: 'started',
    hasCertificate: false,
    certificateFileName: null,
    badgeUrl: null,
  },
];

describe('CustomFrameworksSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a card per custom framework', () => {
    render(
      <CustomFrameworksSection orgId="org_1" canUpdate initialCustomFrameworks={frameworks} />,
    );

    expect(screen.getByText('Acme Internal Standard')).toBeInTheDocument();
    expect(screen.getByText('HR Security Base')).toBeInTheDocument();
  });

  it('reflects each framework status (enabled shows status, disabled shows Disabled)', () => {
    render(
      <CustomFrameworksSection orgId="org_1" canUpdate initialCustomFrameworks={frameworks} />,
    );

    // Enabled + compliant framework shows its status; disabled one shows "Disabled".
    expect(screen.getByText('Compliant')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('shows an empty state when the org has no custom frameworks', () => {
    render(<CustomFrameworksSection orgId="org_1" canUpdate initialCustomFrameworks={[]} />);

    expect(screen.getByText('No custom frameworks yet.')).toBeInTheDocument();
  });

  it('disables the toggle for read-only users', () => {
    render(
      <CustomFrameworksSection
        orgId="org_1"
        canUpdate={false}
        initialCustomFrameworks={frameworks}
      />,
    );

    // The design-system Switch (Base UI) marks disabled via aria-disabled.
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThan(0);
    switches.forEach((toggle) => expect(toggle).toHaveAttribute('aria-disabled', 'true'));
  });

  it('shows a badge uploader on each framework for admins', () => {
    render(
      <CustomFrameworksSection orgId="org_1" canUpdate initialCustomFrameworks={frameworks} />,
    );

    // One upload affordance per framework (neither has a badge yet).
    expect(screen.getAllByLabelText('Upload badge')).toHaveLength(2);
  });

  it('hides the badge uploader for read-only users', () => {
    render(
      <CustomFrameworksSection
        orgId="org_1"
        canUpdate={false}
        initialCustomFrameworks={frameworks}
      />,
    );

    expect(screen.queryByLabelText('Upload badge')).toBeNull();
    expect(screen.queryByLabelText('Replace badge')).toBeNull();
    expect(screen.queryByLabelText('Remove badge')).toBeNull();
  });

  it('renders an uploaded badge image with a remove control for admins', () => {
    render(
      <CustomFrameworksSection
        orgId="org_1"
        canUpdate
        initialCustomFrameworks={[{ ...frameworks[0], badgeUrl: 'https://signed/badge.png' }]}
      />,
    );

    expect(screen.getByAltText('Acme Internal Standard badge')).toBeInTheDocument();
    expect(screen.getByLabelText('Replace badge')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove badge')).toBeInTheDocument();
  });

  it('still shows an uploaded badge to read-only users (without controls)', () => {
    render(
      <CustomFrameworksSection
        orgId="org_1"
        canUpdate={false}
        initialCustomFrameworks={[{ ...frameworks[0], badgeUrl: 'https://signed/badge.png' }]}
      />,
    );

    expect(screen.getByAltText('Acme Internal Standard badge')).toBeInTheDocument();
    expect(screen.queryByLabelText('Remove badge')).toBeNull();
  });
});
