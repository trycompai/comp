import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { DeviceWithChecks, FleetPolicy, Host } from '../../devices/types';

// Radix Tabs renders non-active content with `hidden`. For device-tab tests we
// stub Tabs/TabsContent to always render children so assertions work without
// user interaction.
vi.mock('@trycompai/design-system', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@trycompai/design-system')>();
  return {
    ...mod,
    Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    TabsTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    TabsContent: ({ children, value }: { children: ReactNode; value: string }) => (
      <div data-tab={value}>{children}</div>
    ),
  };
});

// PolicyItem pulls in heavy UI modules; none of its behaviour matters here.
vi.mock('../../devices/components/PolicyItem', () => ({
  PolicyItem: () => null,
}));

// Server actions invoked from download handlers — never triggered in these tests.
vi.mock('../actions/download-training-certificate', () => ({
  downloadTrainingCertificate: vi.fn(),
}));
vi.mock('../actions/download-hipaa-certificate', () => ({
  downloadHipaaCertificate: vi.fn(),
}));

import { EmployeeTasks } from './EmployeeTasks';

const baseEmployee = {
  id: 'mem_1',
  userId: 'usr_1',
  organizationId: 'org_1',
  role: 'employee',
  department: null,
  isActive: true,
  deactivated: false,
  fleetDmLabelId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: 'usr_1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    emailVerified: true,
    image: null,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    banned: false,
    banReason: null,
    banExpires: null,
  },
} as unknown as Parameters<typeof EmployeeTasks>[0]['employee'];

const baseOrganization = {
  id: 'org_1',
  name: 'Test Org',
  securityTrainingStepEnabled: true,
  deviceAgentStepEnabled: true,
} as unknown as Parameters<typeof EmployeeTasks>[0]['organization'];

function makeDevice(overrides: Partial<DeviceWithChecks> = {}): DeviceWithChecks {
  return {
    id: 'dev_1',
    name: 'Jane MacBook',
    hostname: 'jane-mbp',
    platform: 'macos',
    osVersion: '14.0',
    serialNumber: 'SN1',
    hardwareModel: 'MBP',
    isCompliant: true,
    diskEncryptionEnabled: true,
    antivirusEnabled: true,
    passwordPolicySet: true,
    screenLockEnabled: true,
    checkDetails: null,
    lastCheckIn: new Date().toISOString(),
    agentVersion: '1.0.0',
    installedAt: new Date().toISOString(),
    memberId: 'mem_1',
    user: { name: 'Jane', email: 'jane@example.com' },
    source: 'device_agent',
    complianceStatus: 'compliant',
    daysSinceLastCheckIn: 0,
    ...overrides,
  };
}

function renderWithDevice(memberDevice: DeviceWithChecks | null) {
  return render(
    <EmployeeTasks
      employee={baseEmployee}
      policies={[]}
      trainingVideos={[]}
      host={null as unknown as Host}
      fleetPolicies={[] as FleetPolicy[]}
      organization={baseOrganization}
      memberDevice={memberDevice}
      hasHipaaFramework={false}
      hipaaCompletedAt={null}
    />,
  );
}

describe('EmployeeTasks device compliance badge', () => {
  it('shows "Compliant" badge when complianceStatus is compliant', () => {
    renderWithDevice(makeDevice({ complianceStatus: 'compliant' }));
    expect(screen.getByText('Compliant')).toBeInTheDocument();
    expect(screen.queryByText('Non-Compliant')).not.toBeInTheDocument();
  });

  it('shows "Non-Compliant" badge when complianceStatus is non_compliant', () => {
    renderWithDevice(
      makeDevice({
        complianceStatus: 'non_compliant',
        isCompliant: false,
        diskEncryptionEnabled: false,
      }),
    );
    expect(screen.getByText('Non-Compliant')).toBeInTheDocument();
  });

  it('shows "Stale (Nd)" badge and em-dash check badges when complianceStatus is stale', () => {
    renderWithDevice(
      makeDevice({
        complianceStatus: 'stale',
        daysSinceLastCheckIn: 12,
      }),
    );
    expect(screen.getByText('Stale (12d)')).toBeInTheDocument();
    expect(screen.queryByText('Compliant')).not.toBeInTheDocument();
    expect(screen.queryByText('Non-Compliant')).not.toBeInTheDocument();
    expect(screen.queryByText('Pass')).not.toBeInTheDocument();
    expect(screen.queryByText('Fail')).not.toBeInTheDocument();
    // One per check (4 checks)
    expect(screen.getAllByText('—').length).toBe(4);
  });

  it('shows plain "Stale" when daysSinceLastCheckIn is null', () => {
    renderWithDevice(
      makeDevice({
        complianceStatus: 'stale',
        daysSinceLastCheckIn: null,
        lastCheckIn: null,
      }),
    );
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('renders a stale-explainer tooltip trigger for a stale device', () => {
    renderWithDevice(makeDevice({ complianceStatus: 'stale', daysSinceLastCheckIn: 9 }));
    expect(
      screen.getByRole('button', { name: /What does Stale mean\?/i }),
    ).toBeInTheDocument();
  });

  it('renders the stale-explainer tooltip trigger when daysSinceLastCheckIn is null (never reported)', () => {
    renderWithDevice(
      makeDevice({
        complianceStatus: 'stale',
        daysSinceLastCheckIn: null,
        lastCheckIn: null,
      }),
    );
    expect(
      screen.getByRole('button', { name: /What does Stale mean\?/i }),
    ).toBeInTheDocument();
  });

  it('does not render the stale-explainer tooltip trigger for a compliant device', () => {
    renderWithDevice(makeDevice({ complianceStatus: 'compliant' }));
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render the stale-explainer tooltip trigger for a non-compliant device', () => {
    renderWithDevice(
      makeDevice({
        complianceStatus: 'non_compliant',
        isCompliant: false,
        diskEncryptionEnabled: false,
      }),
    );
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
  });
});
