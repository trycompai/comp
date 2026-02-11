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
