import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DeviceWithChecks } from '../types';
import { DeviceDetails } from './DeviceDetails';

function makeDevice(overrides: Partial<DeviceWithChecks> = {}): DeviceWithChecks {
  return {
    id: 'dev_1',
    name: 'Work Laptop',
    hostname: 'work-laptop',
    platform: 'macos',
    osVersion: '14.0',
    serialNumber: 'SN123',
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
    hasActiveAgentSession: false,
    ...overrides,
  };
}

describe('DeviceDetails compliance badge', () => {
  it('renders "Compliant" when complianceStatus is compliant', () => {
    render(<DeviceDetails device={makeDevice()} onClose={vi.fn()} />);
    expect(screen.getByText('Compliant')).toBeInTheDocument();
    expect(screen.queryByText('Non-Compliant')).not.toBeInTheDocument();
  });

  it('renders "Non-Compliant" when complianceStatus is non_compliant', () => {
    render(
      <DeviceDetails
        device={makeDevice({
          complianceStatus: 'non_compliant',
          isCompliant: false,
          diskEncryptionEnabled: false,
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Non-Compliant')).toBeInTheDocument();
  });

  it('renders "Stale (Nd)" and em-dash result badges when complianceStatus is stale', () => {
    render(
      <DeviceDetails
        device={makeDevice({
          complianceStatus: 'stale',
          daysSinceLastCheckIn: 21,
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Stale (21d)')).toBeInTheDocument();
    expect(screen.queryByText('Pass')).not.toBeInTheDocument();
    expect(screen.queryByText('Fail')).not.toBeInTheDocument();
    // 4 check rows + the 4 exception cells + 4 detail cells all show '—'
    const dashes = screen.getAllByText('—');
    // At minimum: 4 result badges (stale)
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });

  it('renders bare "Stale" when daysSinceLastCheckIn is null', () => {
    render(
      <DeviceDetails
        device={makeDevice({
          complianceStatus: 'stale',
          daysSinceLastCheckIn: null,
          lastCheckIn: null,
        })}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Stale')).toBeInTheDocument();
  });

  it('renders a stale-explainer tooltip trigger for a stale device', () => {
    render(
      <DeviceDetails
        device={makeDevice({ complianceStatus: 'stale', daysSinceLastCheckIn: 30 })}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /What does Stale mean\?/i }),
    ).toBeInTheDocument();
  });

  it('renders the stale-explainer tooltip trigger when daysSinceLastCheckIn is null (never reported)', () => {
    render(
      <DeviceDetails
        device={makeDevice({
          complianceStatus: 'stale',
          daysSinceLastCheckIn: null,
          lastCheckIn: null,
        })}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: /What does Stale mean\?/i }),
    ).toBeInTheDocument();
  });

  it('does not render the stale-explainer tooltip trigger for a compliant device', () => {
    render(<DeviceDetails device={makeDevice()} onClose={vi.fn()} />);
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render the stale-explainer tooltip trigger for a non-compliant device', () => {
    render(
      <DeviceDetails
        device={makeDevice({
          complianceStatus: 'non_compliant',
          isCompliant: false,
          diskEncryptionEnabled: false,
        })}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /What does Stale mean\?/i }),
    ).not.toBeInTheDocument();
  });
});
