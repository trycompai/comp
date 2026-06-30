import type { DeviceWithChecks } from '../types';

/**
 * Human label for where a device came from. Shared by the devices table and the
 * CSV export so the two can't drift on source labels.
 */
export function sourceLabel(device: DeviceWithChecks): string {
  if (device.source === 'integration') {
    return device.integrationProvider?.name ?? 'Integration';
  }
  if (device.source === 'fleet') return 'Fleet';
  return 'Comp Agent';
}

/**
 * True for devices whose compliance posture CompAI actually collects. Only
 * integration-imported devices are inventory-only ("Not tracked"); agent and
 * Fleet devices both report real compliance.
 */
export function isComplianceTracked(device: DeviceWithChecks): boolean {
  return device.source !== 'integration';
}
