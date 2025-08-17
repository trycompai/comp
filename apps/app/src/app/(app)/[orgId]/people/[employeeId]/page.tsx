import { auth } from '@/utils/auth';

import { getPostHogClient } from '@/app/posthog';
import PageWithBreadcrumb from '@/components/pages/PageWithBreadcrumb';
import {
  type TrainingVideo,
  trainingVideos as trainingVideosData,
} from '@/lib/data/training-videos';
import { getFleetInstance } from '@/lib/fleet';
import type { EmployeeTrainingVideoCompletion, Member } from '@db';
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

  const organizationId = session?.session.activeOrganizationId;

  if (!organizationId) {
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
  const isFleetEnabled = await getPostHogClient()?.isFeatureEnabled(
    'is-fleet-enabled',
    session?.session.userId,
  );

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
        isFleetEnabled={isFleetEnabled ?? false}
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

const getFleetPolicies = async (member: Member) => {
  const deviceLabelId = member.fleetDmLabelId;
  const fleet = await getFleetInstance();

  if (!deviceLabelId) {
    return { fleetPolicies: [], device: null };
  }

  try {
    const deviceResponse = await fleet.get(`/labels/${deviceLabelId}/hosts`);
    const device = deviceResponse.data.hosts?.[0]; // There should only be one device per label.

    if (!device) {
      console.log(`No host found for device label id: ${deviceLabelId} - member: ${member.id}`);
      return { fleetPolicies: [], device: null };
    }

    const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
    const fleetPolicies = deviceWithPolicies.data.host.policies;
    return { fleetPolicies, device };
  } catch (error) {
    console.error(`Failed to get fleet policies for member: ${member.id}`, error);
    return { fleetPolicies: [], device: null };
  }
};
