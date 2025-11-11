import { auth } from '@/utils/auth';

import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import {
  type TrainingVideo,
  trainingVideos as trainingVideosData,
} from '@/lib/data/training-videos';
import { getFleetInstance } from '@/lib/fleet';
import type { EmployeeTrainingVideoCompletion, Member, User } from '@db';
import { db } from '@db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Employee } from './components/Employee';

export default async function EmployeeDetailsPage({
  params,
}: {
  params: Promise<{ employeeId: string; orgId: string }>;
}) {
  const { employeeId, orgId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const currentUserMember = await db.member.findFirst({
    where: {
      organizationId: orgId,
      userId: session?.user?.id,
    },
  });

  const canEditMembers =
    currentUserMember?.role.includes('owner') || currentUserMember?.role.includes('admin') || false;

  if (!orgId) {
    redirect('/');
  }

  const policies = await getPoliciesTasks(employeeId);
  const employeeTrainingVideos = await getTrainingVideos(employeeId);
  const employee = await getEmployee(employeeId);

  // If employee doesn't exist, show 404 page
  if (!employee) {
    notFound();
  }

  const { fleetPolicies, device } = await getFleetPolicies(employee);

  return (
    <PageWithBreadcrumb
      breadcrumbs={[
        { label: 'People', href: `/${orgId}/people/all` },
        { label: employee.user.name, current: true },
      ]}
    >
      <Employee
        employee={employee}
        policies={policies}
        trainingVideos={employeeTrainingVideos}
        fleetPolicies={fleetPolicies}
        host={device}
        canEdit={canEditMembers}
      />
    </PageWithBreadcrumb>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Employee Details',
  };
}

const getEmployee = async (employeeId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    redirect('/');
  }

  const employee = await db.member.findFirst({
    where: {
      id: employeeId,
      organizationId,
    },
    include: {
      user: true,
    },
  });

  return employee;
};

const getPoliciesTasks = async (employeeId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    redirect('/');
  }

  const policies = await db.policy.findMany({
    where: {
      organizationId: organizationId,
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
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
    redirect('/');
  }

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
    const fleetPolicies = deviceWithPolicies.data.host.policies || [];

    return { fleetPolicies, device: deviceWithPolicies.data.host };
  } catch (error) {
    console.error(
      `Failed to get device using individual fleet label for member: ${member.id}`,
      error,
    );
    return { fleetPolicies: [], device: null };
  }
};
