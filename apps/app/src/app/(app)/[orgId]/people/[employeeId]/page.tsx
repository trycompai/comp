import { serverApi } from '@/lib/api-server';

import {
  type TrainingVideo,
  trainingVideos as trainingVideosData,
} from '@/lib/data/training-videos';
import { getFleetInstance } from '@/lib/fleet';
import type { EmployeeTrainingVideoCompletion, Member, User } from '@db';
import { db } from '@db';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Employee } from './components/Employee';

const MDM_POLICY_ID = -9999;

interface PeopleMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string;
  department: string;
  isActive: boolean;
  fleetDmLabelId: number | null;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: string;
    updatedAt: string;
    lastLogin: string | null;
    isPlatformAdmin: boolean;
  };
}

interface PeopleDetailResponse extends PeopleMember {
  authType: string;
  authenticatedUser?: { id: string; email: string };
}

interface PeopleListResponse {
  data: PeopleMember[];
  count: number;
  authenticatedUser?: { id: string; email: string };
}

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ employeeId: string; orgId: string }>;
}) {
  const { employeeId, orgId } = await params;

  if (!orgId) {
    redirect('/');
  }

  // Fetch employee details and all members (for permission check) in parallel
  const [employeeResponse, membersResponse] = await Promise.all([
    serverApi.get<PeopleDetailResponse>(`/v1/people/${employeeId}`),
    serverApi.get<PeopleListResponse>('/v1/people'),
  ]);

  if (!employeeResponse.data) {
    notFound();
  }

  const employee = employeeResponse.data as unknown as Member & { user: User };
  const currentUserId = membersResponse.data?.authenticatedUser?.id;
  const currentUserMember = (membersResponse.data?.data ?? []).find(
    (m) => m.userId === currentUserId,
  );

  const canEditMembers =
    currentUserMember?.role.includes('owner') ||
    currentUserMember?.role.includes('admin') ||
    false;

  // TODO: Migrate to API endpoints when policies/training/org APIs are available
  const [policies, employeeTrainingVideos, organization] = await Promise.all([
    getPoliciesTasks(orgId),
    getTrainingVideos(employeeId),
    db.organization.findUnique({ where: { id: orgId } }),
  ]);

  if (!organization) {
    notFound();
  }

  const { fleetPolicies, device } = await getFleetPolicies(employee);

  return (
    <PageLayout
      header={
        <PageHeader
          title={employee.user.name ?? 'Employee'}
          breadcrumbs={[
            { label: 'People', href: `/${orgId}/people` },
            { label: employee.user.name ?? 'Employee', isCurrent: true },
          ]}
        />
      }
    >
      <Employee
        employee={employee}
        policies={policies}
        trainingVideos={employeeTrainingVideos}
        fleetPolicies={fleetPolicies}
        host={device}
        canEdit={canEditMembers}
        organization={organization}
      />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Employee Details',
  };
}

const getPoliciesTasks = async (organizationId: string) => {
  const policies = await db.policy.findMany({
    where: {
      organizationId,
      status: 'published',
      isRequiredToSign: true,
      isArchived: false,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return policies;
};

const getTrainingVideos = async (employeeId: string) => {
  const employeeTrainingVideos = await db.employeeTrainingVideoCompletion.findMany({
    where: {
      memberId: employeeId,
    },
    orderBy: {
      videoId: 'asc',
    },
  });

  // Map the db records to include the matching metadata from the training videos data
  // Filter out any videos where metadata is not found to ensure type safety
  return employeeTrainingVideos
    .map((dbVideo) => {
      // Find the training video metadata with the matching ID
      const videoMetadata = trainingVideosData.find(
        (metadataVideo) => metadataVideo.id === dbVideo.videoId,
      );

      // Only return videos that have matching metadata
      if (videoMetadata) {
        return {
          ...dbVideo,
          metadata: videoMetadata,
        };
      }
      return null;
    })
    .filter(
      (
        video,
      ): video is EmployeeTrainingVideoCompletion & {
        metadata: TrainingVideo;
      } => video !== null,
    );
};

const getFleetPolicies = async (member: Member & { user: User }) => {
  const fleet = await getFleetInstance();

  // Only show device if the employee has their own specific fleetDmLabelId
  if (!member.fleetDmLabelId) {
    console.log(
      `No individual fleetDmLabelId found for member: ${member.id}, member email: ${member.user?.email}. No device will be shown.`,
    );
    return { fleetPolicies: [], device: null };
  }

  try {
    const deviceResponse = await fleet.get(`/labels/${member.fleetDmLabelId}/hosts`);
    const device = deviceResponse.data.hosts?.[0];

    if (!device) {
      console.log(
        `No device found for fleetDmLabelId: ${member.fleetDmLabelId} for member: ${member.id}`,
      );
      return { fleetPolicies: [], device: null };
    }

    const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
    const host = deviceWithPolicies.data.host;

    const results = await db.fleetPolicyResult.findMany({
      where: {
        organizationId: member.organizationId,
        userId: member.userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    const platform = host.platform?.toLowerCase();
    const osVersion = host.os_version?.toLowerCase();
    const isMacOS =
      platform === 'darwin' ||
      platform === 'macos' ||
      platform === 'osx' ||
      osVersion?.includes('mac');

    return {
      fleetPolicies: [
        ...(host.policies || []),
        ...(isMacOS ? [{ id: MDM_POLICY_ID, name: 'MDM Enabled', response: host.mdm.connected_to_fleet ? 'pass' : 'fail' }] : []),
      ].map((policy) => {
        const policyResult = results.find((result) => result.fleetPolicyId === policy.id);
        return {
          ...policy,
          response: policy.response === 'pass' || policyResult?.fleetPolicyResponse === 'pass' ? 'pass' : 'fail',
          attachments: policyResult?.attachments || [],
        };
      }),
      device: host
    };
  } catch (error) {
    console.error(
      `Failed to get device using individual fleet label for member: ${member.id}`,
      error,
    );
    return { fleetPolicies: [], device: null };
  }
};
