'use server';

import { getFleetInstance } from '@/lib/fleet';
import { auth } from '@/utils/auth';
import { db } from '@db';
import { headers } from 'next/headers';
import type { Host } from '../types';

export const getEmployeeDevices: () => Promise<Host[] | null> = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const fleet = await getFleetInstance();

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return null;
  }

  // Find all members belonging to the organization.
  const employees = await db.member.findMany({
    where: {
      organizationId,
      deactivated: false,
    },
  });

  const labelIdsResponses = await Promise.all(
    employees
      .filter((employee) => employee.fleetDmLabelId)
      .map((employee) => fleet.get(`/labels/${employee.fleetDmLabelId}/hosts`)),
  );
  const allIds = labelIdsResponses.flatMap((response) =>
    response.data.hosts.map((host: { id: number }) => host.id),
  );

  // Get all devices by id. in parallel
  const devices = await Promise.all(allIds.map((id: number) => fleet.get(`/hosts/${id}`)));

  return devices.map((device: { data: { host: Host } }) => device.data.host);
};
