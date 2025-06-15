"use server";

import { db } from "@comp/db";
import type { Organization } from "@comp/db/types";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export async function getCurrentOrganization({
  requestedOrgId,
}: {
  requestedOrgId: string;
}): Promise<Organization | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const activeOrgId = session?.session?.activeOrganizationId;
  const userId = session?.session?.userId;

  if (requestedOrgId === activeOrgId) {
    return db.organization.findFirst({
      where: {
        id: activeOrgId,
      },
    });
  }

  return db.organization.findFirst({
    where: {
      id: requestedOrgId,
      members: { some: { userId } },
    },
  });
}
