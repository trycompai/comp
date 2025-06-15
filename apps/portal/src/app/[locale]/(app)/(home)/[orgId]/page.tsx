import { db } from "@comp/db";
import { OrganizationDashboard } from "./components/OrganizationDashboard";
import { auth } from "@/app/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fleet } from "@/utils/fleet";
import type { Member } from "@comp/db/types";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login"); // Or appropriate login/auth route
  }

  const member = await db.member.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
    },
    include: {
      user: true,
      organization: true, // Include organization details
    },
  });

  if (!member) {
    redirect("/"); // Or appropriate login/auth route
  }

  const { fleetPolicies, device } = await getFleetPolicies(member);

  return (
    <OrganizationDashboard
      key={orgId} // Use organizationId as key
      organizationId={orgId}
      member={member}
      fleetPolicies={fleetPolicies}
      host={device}
    />
  );
}

const getFleetPolicies = async (member: Member) => {
  const deviceLabelId = member.fleetDmLabelId;

  try {
    const deviceResponse = await fleet.get(`/labels/${deviceLabelId}/hosts`);
    const device = deviceResponse.data.hosts[0]; // There should only be one device per label.
    const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
    const fleetPolicies = deviceWithPolicies.data.host.policies;
    return { fleetPolicies, device };
  } catch (error) {
    console.error(error);
    return { fleetPolicies: [], device: null };
  }
};
