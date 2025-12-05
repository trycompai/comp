'use server';

import { auth } from '@/app/lib/auth';
import { getFleetInstance } from '@/utils/fleet';
import type { Member } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrganizationDashboard } from './components/OrganizationDashboard';
import type { FleetPolicy, Host } from './types';

export default async function OrganizationPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  // Auth check with error handling
  const session = await auth.api.getSession({
    headers: await headers(),
  }).catch((error) => {
    console.error('Error getting session:', error);
    redirect('/');
  });

  if (!session?.user) {
    redirect('/auth');
  }

  // Fetch member with error handling
  let member;

  try {
    member = await db.member.findFirst({
      where: {
        userId: session.user.id,
        organizationId: orgId,
        deactivated: false,
      },
      include: {
        user: true,
        organization: true,
      },
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    redirect('/');
  }

  // Member check - redirect happens outside try-catch
  if (!member) {
    redirect('/');
  }

  // Fleet policies - already has graceful error handling in getFleetPolicies
  const fleetData = await getFleetPolicies(member);

  return (
    <OrganizationDashboard
      key={orgId}
      organizationId={orgId}
      member={member}
      fleetPolicies={fleetData.fleetPolicies}
      host={fleetData.device}
    />
  );
}

const getFleetPolicies = async (
  member: Member,
): Promise<{ fleetPolicies: FleetPolicy[]; device: Host | null }> => {
  const deviceLabelId = member.fleetDmLabelId;

  // Return early if no deviceLabelId
  if (!deviceLabelId) {
    console.log('No fleet device label ID found for member');
    return { fleetPolicies: [], device: null };
  }

  try {
    const fleet = await getFleetInstance();

    const deviceResponse = await fleet.get(`/labels/${deviceLabelId}/hosts`);
    const device: Host | undefined = deviceResponse.data.hosts[0]; // There should only be one device per label.

    if (!device) {
      return { fleetPolicies: [], device: null };
    }

    const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
    const fleetPolicies: FleetPolicy[] = deviceWithPolicies.data.host.policies || [];
    return { fleetPolicies, device };
  } catch (error: any) {
    // Log more details about the error
    if (error.response?.status === 404) {
      console.log(`Fleet endpoint not found for label ID: ${deviceLabelId}`);
    } else {
      console.error('Error fetching fleet policies:', error.message || error);
    }
    return { fleetPolicies: [], device: null };
  }
};
