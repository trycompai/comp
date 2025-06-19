import { auth } from '@/app/lib/auth';
import { getPostHogClient } from '@/app/posthog';
import { getFleetInstance } from '@/utils/fleet';
import { db } from '@comp/db';
import type { Member } from '@comp/db/types';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrganizationDashboard } from './components/OrganizationDashboard';
import type { FleetPolicy, Host } from './types';

export default async function OrganizationPage({ params }: { params: Promise<{ orgId: string }> }) {
  try {
    const { orgId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      redirect('/login'); // Or appropriate login/auth route
    }

    let member = null;

    try {
      member = await db.member.findFirst({
        where: {
          userId: session.user.id,
          organizationId: orgId,
        },
        include: {
          user: true,
          organization: true, // Include organization details
        },
      });
    } catch (error) {
      console.error('Error fetching member:', error);
      // Return a fallback UI or redirect to error page
      redirect('/');
    }

    if (!member) {
      redirect('/'); // Or appropriate login/auth route
    }

    const { fleetPolicies, device } = await getFleetPolicies(member);

    let isFleetEnabled = false;
    try {
      const postHogClient = await getPostHogClient();
      isFleetEnabled =
        (await postHogClient?.isFeatureEnabled('is-fleet-enabled', session?.user.id)) ?? false;
    } catch (error) {
      console.error('Error checking fleet feature flag:', error);
      // Default to false if there's an error
    }

    return (
      <OrganizationDashboard
        key={orgId} // Use organizationId as key
        organizationId={orgId}
        member={member}
        fleetPolicies={fleetPolicies}
        host={device}
        isFleetEnabled={isFleetEnabled}
      />
    );
  } catch (error) {
    console.error('Error in OrganizationPage:', error);
    // Redirect to a safe page if there's an unexpected error
    redirect('/');
  }
}

const getFleetPolicies = async (
  member: Member,
): Promise<{ fleetPolicies: FleetPolicy[]; device: Host | null }> => {
  const deviceLabelId = member.fleetDmLabelId;
  const fleet = await getFleetInstance();

  try {
    const deviceResponse = await fleet.get(`/labels/${deviceLabelId}/hosts`);
    const device: Host | undefined = deviceResponse.data.hosts[0]; // There should only be one device per label.

    if (!device) {
      return { fleetPolicies: [], device: null };
    }

    const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
    const fleetPolicies: FleetPolicy[] = deviceWithPolicies.data.host.policies;
    return { fleetPolicies, device };
  } catch (error) {
    console.error(error);
    return { fleetPolicies: [], device: null };
  }
};
