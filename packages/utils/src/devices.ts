/**
 * Merges two device lists, deduplicating by serial number and hostname.
 * Priority devices (first argument) take precedence over secondary devices.
 *
 * This is used to merge device-agent devices (priority) with FleetDM devices,
 * ensuring no duplicates appear when a device is tracked by both systems.
 */
export function mergeDeviceLists<T>(
  priorityDevices: T[],
  secondaryDevices: T[],
  accessors: {
    getSerialNumber: (device: T) => string | null | undefined;
    getHostname: (device: T) => string | null | undefined;
  },
): T[] {
  const knownSerials = new Set<string>();
  const knownHostnames = new Set<string>();

  for (const device of priorityDevices) {
    const serial = accessors.getSerialNumber(device);
    const hostname = accessors.getHostname(device);
    if (serial) knownSerials.add(serial.toLowerCase());
    if (hostname) knownHostnames.add(hostname.toLowerCase());
  }

  const uniqueSecondaryDevices = secondaryDevices.filter((device) => {
    const serial = accessors.getSerialNumber(device);
    const hostname = accessors.getHostname(device);
    if (serial && knownSerials.has(serial.toLowerCase())) return false;
    if (hostname && knownHostnames.has(hostname.toLowerCase())) return false;
    return true;
  });

  return [...priorityDevices, ...uniqueSecondaryDevices];
}

/** How long without a check-in before a device is considered stale. */
export const STALE_DEVICE_THRESHOLD_DAYS = 7;

export type DeviceComplianceStatus = 'compliant' | 'non_compliant' | 'stale';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Whole days since `lastCheckIn`. Returns null when the device has never
 * checked in. Uses `Date.now()` so tests can freeze time.
 */
export function daysSinceCheckIn(lastCheckIn: Date | string | null): number | null {
  if (lastCheckIn === null) return null;
  const then = toDate(lastCheckIn).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / MS_PER_DAY);
}

/**
 * True when a device hasn't checked in within STALE_DEVICE_THRESHOLD_DAYS.
 * A device that has never synced is always stale.
 */
export function isDeviceStale(lastCheckIn: Date | string | null): boolean {
  const days = daysSinceCheckIn(lastCheckIn);
  if (days === null) return true;
  return days >= STALE_DEVICE_THRESHOLD_DAYS;
}

/**
 * Three-state compliance status. Stale wins over the stored `isCompliant`
 * because old check-in data cannot be trusted.
 */
export function getDeviceComplianceStatus({
  isCompliant,
  lastCheckIn,
}: {
  isCompliant: boolean;
  lastCheckIn: Date | string | null;
}): DeviceComplianceStatus {
  if (isDeviceStale(lastCheckIn)) return 'stale';
  return isCompliant ? 'compliant' : 'non_compliant';
}
