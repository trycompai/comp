'use server';

import { auth } from '@/app/lib/auth';
import { getFleetInstance } from '@/utils/fleet';
import type { FleetPolicyResult, Member } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OrganizationDashboard } from './components/OrganizationDashboard';
import type { FleetPolicy, Host } from './types';

const MDM_POLICY_ID = -9999;

export default async function OrganizationPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;

  // Auth check with error handling
  const session = await auth.api
    .getSession({
      headers: await headers(),
    })
    .catch((error) => {
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

    const platform = device.platform?.toLowerCase();
    const osVersion = device.os_version?.toLowerCase();
    const isMacOS =
      platform === 'darwin' ||
      platform === 'macos' ||
      platform === 'osx' ||
      osVersion?.includes('mac');
    const mdmEnabledStatus = {
      id: MDM_POLICY_ID,
      response: device.mdm.connected_to_fleet ? 'pass' : 'fail',
      name: 'MDM Enabled',
    };
    const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
    const fleetPolicies: FleetPolicy[] = [
      ...(deviceWithPolicies.data.host.policies || []),
      ...(isMacOS ? [mdmEnabledStatus] : []),
    ];

    // Get Policy Results from the database.
    const fleetPolicyResults = await getFleetPolicyResults(member.organizationId);
    return {
      device,
      fleetPolicies: fleetPolicies.map((policy) => {
        const policyResult = fleetPolicyResults.find((result) => result.fleetPolicyId === policy.id);
        return {
          ...policy,
          response: policy.response === 'pass' || policyResult?.fleetPolicyResponse === 'pass' ? 'pass' : 'fail',
          attachments: policyResult?.attachments || [],
        }
      }),
    };
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

const getFleetPolicyResults = async (organizationId: string): Promise<FleetPolicyResult[]> => {
  try {
    const portalBase = process.env.NEXT_PUBLIC_BETTER_AUTH_URL?.replace(/\/$/, '');
    const url = `${portalBase}/api/fleet-policy?organizationId=${organizationId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: await headers(),
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch fleet policy results', res.status, await res.text());
      return [];
    }

    const json = (await res.json()) as { success?: boolean; data?: FleetPolicyResult[] };
    return json.data ?? [];
  } catch (error) {
    console.error('Error fetching fleet policy results', error);
    return [];
  }
};
