import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DeviceWithChecks, Host } from '../types';

// Mock recharts — render children only, no canvas needed
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie">{children}</div>
  ),
  Cell: () => <div data-testid="cell" />,
  Label: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock @trycompai/ui chart components
vi.mock('@trycompai/ui/chart', () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

import { DeviceComplianceChart } from './DeviceComplianceChart';

function makeAgentDevice(overrides: Partial<DeviceWithChecks> = {}): DeviceWithChecks {
  return {
    id: `dev_${Math.random().toString(36).slice(2)}`,
    name: 'MacBook Pro',
    hostname: 'macbook-pro',
    platform: 'macos',
    osVersion: '14.0',
    serialNumber: 'SN123',
    hardwareModel: 'MacBookPro18,1',
    isCompliant: true,
    diskEncryptionEnabled: true,
    antivirusEnabled: true,
    passwordPolicySet: true,
    screenLockEnabled: true,
    checkDetails: null,
    lastCheckIn: new Date().toISOString(),
    agentVersion: '1.0.0',
    installedAt: new Date().toISOString(),
    user: { name: 'Test User', email: 'test@example.com' },
    source: 'device_agent',
    ...overrides,
  };
}

function makeFleetDevice(overrides: Partial<Host> = {}): Host {
  return {
    id: Math.floor(Math.random() * 10000),
    hostname: 'fleet-host',
    computer_name: 'Fleet Device',
    platform: 'darwin',
    os_version: '14.0',
    hardware_serial: 'FSN123',
    hardware_model: 'MacBookPro18,1',
    status: 'online',
    seen_time: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    disk_encryption_enabled: true,
    display_name: 'Fleet Device',
    display_text: 'Fleet Device',
    software: [],
    software_updated_at: '',
    detail_updated_at: '',
    label_updated_at: '',
    policy_updated_at: '',
    last_enrolled_at: '',
    refetch_requested: false,
    uuid: '',
    osquery_version: '',
    orbit_version: '',
    fleet_desktop_version: '',
    scripts_enabled: false,
    build: '',
    platform_like: '',
    code_name: '',
    uptime: 0,
    memory: 0,
    cpu_type: '',
    cpu_subtype: '',
    cpu_brand: '',
    cpu_physical_cores: 0,
    cpu_logical_cores: 0,
    hardware_vendor: '',
    hardware_version: '',
    public_ip: '',
    primary_ip: '',
    primary_mac: '',
    distributed_interval: 0,
    config_tls_refresh: 0,
    logger_tls_period: 0,
    team_id: null,
    pack_stats: [],
    team_name: null,
    users: [],
    gigs_disk_space_available: 0,
    percent_disk_space_available: 0,
    gigs_total_disk_space: 0,
    issues: {},
    mdm: { connected_to_fleet: false, dep_profile_error: false, encryption_key_available: false, enrollment_status: '' },
    refetch_critical_queries_until: null,
    last_restarted_at: '',
    labels: [],
    packs: [],
    batteries: [],
    end_users: [],
    last_mdm_enrolled_at: '',
    last_mdm_checked_in_at: '',
    policies: [{ id: 1, name: 'Disk Encryption', response: 'pass', attachments: [] }],
    ...overrides,
  } as Host;
}

describe('DeviceComplianceChart', () => {
  it('shows empty state when no devices from either source', () => {
    render(<DeviceComplianceChart fleetDevices={[]} agentDevices={[]} />);
    expect(screen.getByText('No device data available. Please make sure your employees access the portal and install the device agent.')).toBeInTheDocument();
  });

  it('counts agent devices correctly — all compliant', () => {
    const devices = [
      makeAgentDevice({ isCompliant: true }),
      makeAgentDevice({ isCompliant: true }),
    ];

    render(<DeviceComplianceChart fleetDevices={[]} agentDevices={devices} />);
    expect(screen.getByText('Compliant (2)')).toBeInTheDocument();
    expect(screen.getByText('Non-Compliant (0)')).toBeInTheDocument();
  });

  it('counts agent devices correctly — mixed compliance', () => {
    const devices = [
      makeAgentDevice({ isCompliant: true }),
      makeAgentDevice({ isCompliant: false }),
    ];

    render(<DeviceComplianceChart fleetDevices={[]} agentDevices={devices} />);
    expect(screen.getByText('Compliant (1)')).toBeInTheDocument();
    expect(screen.getByText('Non-Compliant (1)')).toBeInTheDocument();
  });

  it('counts fleet devices correctly — all policies pass', () => {
    const devices = [
      makeFleetDevice({
        policies: [
          { id: 1, name: 'Encryption', response: 'pass' },
          { id: 2, name: 'Antivirus', response: 'pass' },
        ],
      }),
    ];

    render(<DeviceComplianceChart fleetDevices={devices} agentDevices={[]} />);
    expect(screen.getByText('Compliant (1)')).toBeInTheDocument();
    expect(screen.getByText('Non-Compliant (0)')).toBeInTheDocument();
  });

  it('counts fleet devices correctly — some policies fail', () => {
    const devices = [
      makeFleetDevice({
        policies: [
          { id: 1, name: 'Encryption', response: 'pass' },
          { id: 2, name: 'Antivirus', response: 'fail' },
        ],
      }),
    ];

    render(<DeviceComplianceChart fleetDevices={devices} agentDevices={[]} />);
    expect(screen.getByText('Compliant (0)')).toBeInTheDocument();
    expect(screen.getByText('Non-Compliant (1)')).toBeInTheDocument();
  });

  it('combines agent and fleet devices in total count', () => {
    const agentDevices = [
      makeAgentDevice({ isCompliant: true }),
      makeAgentDevice({ isCompliant: false }),
    ];
    const fleetDevices = [
      makeFleetDevice({
        policies: [{ id: 1, name: 'Encryption', response: 'pass' }],
      }),
    ];

    render(<DeviceComplianceChart fleetDevices={fleetDevices} agentDevices={agentDevices} />);
    // 1 compliant agent + 1 compliant fleet = 2, 1 non-compliant agent = 1
    expect(screen.getByText('Compliant (2)')).toBeInTheDocument();
    expect(screen.getByText('Non-Compliant (1)')).toBeInTheDocument();
  });

  it('treats fleet device with no policies as compliant', () => {
    const devices = [makeFleetDevice({ policies: [] })];

    render(<DeviceComplianceChart fleetDevices={devices} agentDevices={[]} />);
    // Array.every on empty array returns true
    expect(screen.getByText('Compliant (1)')).toBeInTheDocument();
  });
});
