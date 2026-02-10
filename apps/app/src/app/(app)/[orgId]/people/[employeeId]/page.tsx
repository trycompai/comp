import { serverApi } from '@/lib/api-server';
import {
  type TrainingVideo,
  trainingVideos as trainingVideosData,
} from '@/lib/data/training-videos';
import type {
  EmployeeTrainingVideoCompletion,
  Member,
  Organization,
  Policy,
  User,
} from '@db';
import { PageHeader, PageLayout } from '@trycompai/design-system';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { FleetPolicy, Host } from '../devices/types';
import { Employee } from './components/Employee';

interface PeopleMember {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  fleetDmLabelId: number | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
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

  const [employeeResponse, membersResponse, policiesRes, trainingRes, fleetRes] =
    await Promise.all([
      serverApi.get<PeopleDetailResponse>(`/v1/people/${employeeId}`),
      serverApi.get<PeopleListResponse>('/v1/people'),
      serverApi.get<{ data: Policy[] }>(
        '/v1/policies?status=published&isRequiredToSign=true&isArchived=false',
      ),
      serverApi.get<{ data: EmployeeTrainingVideoCompletion[] }>(
        `/v1/people/${employeeId}/training-videos`,
      ),
      serverApi.get<{ fleetPolicies: FleetPolicy[]; device: Host | null }>(
        `/v1/people/${employeeId}/fleet-compliance`,
      ),
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

  const policies = Array.isArray(policiesRes.data?.data)
    ? policiesRes.data.data
    : [];

  // Map training video DB records to include metadata
  const rawTrainingVideos = Array.isArray(trainingRes.data?.data)
    ? trainingRes.data.data
    : [];
  const employeeTrainingVideos = rawTrainingVideos
    .map((dbVideo) => {
      const videoMetadata = trainingVideosData.find(
        (metadataVideo) => metadataVideo.id === dbVideo.videoId,
      );
      if (videoMetadata) {
        return { ...dbVideo, metadata: videoMetadata };
      }
      return null;
    })
    .filter(
      (video): video is EmployeeTrainingVideoCompletion & { metadata: TrainingVideo } =>
        video !== null,
    );

  const fleetPolicies = fleetRes.data?.fleetPolicies ?? [];
  const device = (fleetRes.data?.device ?? null) as Host;

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
        organization={{ id: orgId } as Organization}
      />
    </PageLayout>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Employee Details',
  };
}
