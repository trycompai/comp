"use server";

import type { Host } from "../types";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { headers } from "next/headers";
import { getFleetInstance } from "@/lib/fleet";

export const getEmployeeDevices: () => Promise<Host[] | null> = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const fleet = await getFleetInstance();

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    return null;
  }

  const organization = await db.organization.findUnique({
    where: {
      id: organizationId,
    },
  });

  if (!organization) {
    return null;
  }

  const labelId = organization.fleetDmLabelId;

  // Get all hosts to get their ids.
  const employeeDevices = await fleet.get(`/labels/${labelId}/hosts`);
  const allIds = employeeDevices.data.hosts.map(
    (host: { id: number }) => host.id,
  );

  // Get all devices by id. in parallel
  const devices = await Promise.all(
    allIds.map((id: number) => fleet.get(`/hosts/${id}`)),
  );

  return devices.map((device: { data: { host: Host } }) => device.data.host);
};
