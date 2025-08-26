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

  const organizationId = session?.session.activeOrganizationId;

  const currentUserMember = await db.member.findFirst({
    where: {
      organizationId,
      userId: session?.user.id,
    },
  });

  const canEditMembers =
    currentUserMember?.role.includes('owner') || currentUserMember?.role.includes('admin') || false;

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
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const organizationId = session?.session.activeOrganizationId;

  // Try individual member's fleet label first
  if (member.fleetDmLabelId) {
    console.log(
      `Found individual fleetDmLabelId: ${member.fleetDmLabelId} for member: ${member.id}, member email: ${member.user?.email}`,
    );

    try {
      const deviceResponse = await fleet.get(`/labels/${member.fleetDmLabelId}/hosts`);
      const device = deviceResponse.data.hosts?.[0];

      if (device) {
        const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
        const fleetPolicies = deviceWithPolicies.data.host.policies;
        return { fleetPolicies, device };
      }
    } catch (error) {
      console.log(
        `Failed to get device using individual fleet label for member: ${member.id}`,
        error,
      );
    }
  }

  // Fallback: Use organization fleet label and find device by matching criteria
  if (!organizationId) {
    console.log('No organizationId available for fallback device lookup');
    return { fleetPolicies: [], device: null };
  }

  try {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization?.fleetDmLabelId) {
      console.log(
        `No organization fleetDmLabelId found for fallback device lookup - member: ${member.id}`,
      );
      return { fleetPolicies: [], device: null };
    }

    console.log(
      `Using organization fleetDmLabelId: ${organization.fleetDmLabelId} as fallback for member: ${member.id}`,
    );

    // Get all devices from organization
    const deviceResponse = await fleet.get(`/labels/${organization.fleetDmLabelId}/hosts`);
    const allDevices = deviceResponse.data.hosts || [];

    if (allDevices.length === 0) {
      console.log('No devices found in organization fleet');
      return { fleetPolicies: [], device: null };
    }

    // Get detailed info for all devices to help match them to the employee
    const devicesWithDetails = await Promise.all(
      allDevices.map(async (device: any) => {
        try {
          const deviceDetails = await fleet.get(`/hosts/${device.id}`);
          return deviceDetails.data.host;
        } catch (error) {
          console.log(`Failed to get details for device ${device.id}:`, error);
          return null;
        }
      }),
    );

    const validDevices = devicesWithDetails.filter(Boolean);

    // Try to match device to employee by computer name containing user's name
    const userName = member.user.name?.toLowerCase();
    const userEmail = member.user.email?.toLowerCase();

    let matchedDevice = null;

    if (userName) {
      // Try to find device with computer name containing user's name
      matchedDevice = validDevices.find(
        (device: any) =>
          device.computer_name?.toLowerCase().includes(userName.split(' ')[0]) ||
          device.computer_name?.toLowerCase().includes(userName.split(' ').pop()),
      );
    }

    if (!matchedDevice && userEmail) {
      // Try to find device with computer name containing part of email
      const emailPrefix = userEmail.split('@')[0];
      matchedDevice = validDevices.find((device: any) =>
        device.computer_name?.toLowerCase().includes(emailPrefix),
      );
    }

    // If no specific match found and there's only one device, assume it's theirs
    if (!matchedDevice && validDevices.length === 1) {
      matchedDevice = validDevices[0];
      console.log(`Only one device found, assigning to member: ${member.id}`);
    }

    if (matchedDevice) {
      console.log(
        `Matched device ${matchedDevice.computer_name} (ID: ${matchedDevice.id}) to member: ${member.id}`,
      );
      return {
        fleetPolicies: matchedDevice.policies || [],
        device: matchedDevice,
      };
    }

    console.log(
      `No device could be matched to member: ${member.id}. Available devices: ${validDevices.map((d: any) => d.computer_name).join(', ')}`,
    );
    return { fleetPolicies: [], device: null };
  } catch (error) {
    console.error(`Failed to get fleet policies using fallback for member: ${member.id}`, error);
    return { fleetPolicies: [], device: null };
  }
};
