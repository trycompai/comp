'use server';

import { getFleetInstance } from '@/lib/fleet';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import type { DeviceWithChecks } from '../types';

/**
 * Fetches all devices and their latest compliance checks for the current organization.
 * Uses the new Device/DeviceCheck models (replacing FleetDM).
 */
export const getEmployeeDevicesFromDB: () => Promise<DeviceWithChecks[]> = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return [];
  }

  const devices = await db.device.findMany({
    where: { organizationId },
    include: {
      checks: {
        orderBy: { checkedAt: 'desc' },
      },
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { installedAt: 'desc' },
  });

  // For each device, keep only the latest check per type
  return devices.map((device) => {
    const latestChecks = new Map<string, (typeof device.checks)[0]>();
    for (const check of device.checks) {
      if (!latestChecks.has(check.checkType)) {
        latestChecks.set(check.checkType, check);
      }
    }

    return {
      id: device.id,
      name: device.name,
      hostname: device.hostname,
      platform: device.platform as 'macos' | 'windows',
      osVersion: device.osVersion,
      serialNumber: device.serialNumber,
      hardwareModel: device.hardwareModel,
      isCompliant: device.isCompliant,
      lastCheckIn: device.lastCheckIn?.toISOString() ?? null,
      agentVersion: device.agentVersion,
      installedAt: device.installedAt.toISOString(),
      user: {
        name: device.user.name,
        email: device.user.email,
      },
      checks: Array.from(latestChecks.values()).map((check) => ({
        id: check.id,
        checkType: check.checkType as
          | 'disk_encryption'
          | 'antivirus'
          | 'password_policy'
          | 'screen_lock',
        passed: check.passed,
        details: check.details as Record<string, unknown> | null,
        checkedAt: check.checkedAt.toISOString(),
      })),
      source: 'device_agent' as const,
    };
  });
};

/**
 * Fetches devices from FleetDM for the current organization.
 * Returns an empty array if FleetDM is not configured or the API call fails.
 */
export const getFleetDevices: () => Promise<DeviceWithChecks[]> = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return [];
  }

  // Check if FleetDM is configured
  if (!process.env.FLEET_URL || !process.env.FLEET_TOKEN) {
    return [];
  }

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: { fleetDmLabelId: true },
  });

  if (!organization?.fleetDmLabelId) {
    return [];
  }

  try {
    const fleet = await getFleetInstance();
    const labelHosts = await fleet.get(`/labels/${organization.fleetDmLabelId}/hosts`);
    const hosts = labelHosts.data?.hosts ?? [];

    if (hosts.length === 0) {
      return [];
    }

    // Fetch detailed info for each host to get policies
    const devicePromises = hosts.map(
      async (host: {
        id: number;
        computer_name: string;
        hostname: string;
        platform: string;
        os_version: string;
        hardware_serial: string;
        hardware_model: string;
        seen_time: string;
        disk_encryption_enabled: boolean;
        created_at: string;
      }) => {
        // Look up which member this host belongs to by checking fleetDmLabelId
        // We need to find the user info for this host
        const members = await db.member.findMany({
          where: {
            organizationId,
            fleetDmLabelId: { not: null },
          },
          include: {
            user: { select: { name: true, email: true } },
          },
        });

        // Try to match host to member by checking each member's label
        let matchedUser = { name: host.computer_name, email: '' };
        for (const member of members) {
          if (!member.fleetDmLabelId) continue;
          try {
            const memberHosts = await fleet.get(`/labels/${member.fleetDmLabelId}/hosts`);
            const memberHost = memberHosts.data?.hosts?.find(
              (h: { id: number }) => h.id === host.id,
            );
            if (memberHost) {
              matchedUser = {
                name: member.user.name ?? host.computer_name,
                email: member.user.email ?? '',
              };
              break;
            }
          } catch {
            // Skip this member if their label lookup fails
          }
        }

        // Map fleet platform to our platform type
        const platform = host.platform?.toLowerCase();
        const mappedPlatform: 'macos' | 'windows' =
          platform === 'darwin' || platform === 'macos' || platform === 'osx' ? 'macos' : 'windows';

        // Use disk_encryption_enabled as a basic compliance check
        const isCompliant = host.disk_encryption_enabled === true;

        const device: DeviceWithChecks = {
          id: `fleet-${host.id}`,
          name: host.computer_name || host.hostname,
          hostname: host.hostname,
          platform: mappedPlatform,
          osVersion: host.os_version || 'Unknown',
          serialNumber: host.hardware_serial || null,
          hardwareModel: host.hardware_model || null,
          isCompliant,
          lastCheckIn: host.seen_time || null,
          agentVersion: null,
          installedAt: host.created_at || new Date().toISOString(),
          user: matchedUser,
          checks: [
            {
              id: `fleet-${host.id}-disk`,
              checkType: 'disk_encryption',
              passed: host.disk_encryption_enabled === true,
              details: { message: host.disk_encryption_enabled ? 'Enabled' : 'Not enabled' },
              checkedAt: host.seen_time || new Date().toISOString(),
            },
          ],
          source: 'fleet' as const,
        };

        return device;
      },
    );

    return await Promise.all(devicePromises);
  } catch (error) {
    console.error('Error fetching fleet devices:', error);
    return [];
  }
};

/**
 * Fetches devices from both the Device Agent DB and FleetDM,
 * deduplicates by serial number or hostname, and returns the merged list.
 * Device-agent entries take priority over FleetDM entries.
 */
export const getAllDevices: () => Promise<DeviceWithChecks[]> = async () => {
  const [agentDevices, fleetDevices] = await Promise.all([
    getEmployeeDevicesFromDB(),
    getFleetDevices(),
  ]);

  // Device-agent entries take priority. Build a set of known serials/hostnames.
  const knownSerials = new Set<string>();
  const knownHostnames = new Set<string>();

  for (const device of agentDevices) {
    if (device.serialNumber) knownSerials.add(device.serialNumber.toLowerCase());
    if (device.hostname) knownHostnames.add(device.hostname.toLowerCase());
  }

  // Only include fleet devices that don't overlap with device-agent entries
  const uniqueFleetDevices = fleetDevices.filter((device) => {
    if (device.serialNumber && knownSerials.has(device.serialNumber.toLowerCase())) {
      return false;
    }
    if (device.hostname && knownHostnames.has(device.hostname.toLowerCase())) {
      return false;
    }
    return true;
  });

  return [...agentDevices, ...uniqueFleetDevices];
};
