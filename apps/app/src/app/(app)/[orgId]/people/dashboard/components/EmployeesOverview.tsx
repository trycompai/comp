import { getTrainingVideos } from '@/lib/data/training-videos';
import { auth } from '@/utils/auth';
import type { Member, Policy, User } from '@db';
import { db } from '@db';
import { headers } from 'next/headers';
import { EmployeeCompletionChart } from './EmployeeCompletionChart';

// Define EmployeeWithUser type similar to EmployeesList
interface EmployeeWithUser extends Member {
  user: User;
}

// Define ProcessedTrainingVideo type
interface ProcessedTrainingVideo {
  id: string;
  memberId: string;
  videoId: string;
  completedAt: Date | null;
  metadata: {
    id: string;
    title: string;
    description: string;
    youtubeId: string;
    url: string;
  };
}

export async function EmployeesOverview() {
  const { getGT } = await import('gt-next/server');
  const t = await getGT();
  const trainingVideosData = getTrainingVideos(t);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const organizationId = session?.session.activeOrganizationId;

  let employees: EmployeeWithUser[] = [];
  let policies: Policy[] = [];
  const processedTrainingVideos: ProcessedTrainingVideo[] = [];

  if (organizationId) {
    // Fetch employees
    const fetchedMembers = await db.member.findMany({
      where: {
        organizationId: organizationId,
      },
      include: {
        user: true,
      },
    });

    employees = fetchedMembers.filter((member) => {
      const roles = member.role.includes(',') ? member.role.split(',') : [member.role];
      return roles.includes('employee');
    });

    console.log(employees);

    // Fetch required policies
    policies = await db.policy.findMany({
      where: {
        organizationId: organizationId,
        isRequiredToSign: true,
      },
    });

    // Fetch and process training videos if employees exist
    if (employees.length > 0) {
      const employeeTrainingVideos = await db.employeeTrainingVideoCompletion.findMany({
        where: {
          memberId: {
            in: employees.map((employee) => employee.id),
          },
        },
      });

      for (const dbVideo of employeeTrainingVideos) {
        const videoMetadata = trainingVideosData.find(
          (metadataVideo: any) => metadataVideo.id === dbVideo.videoId,
        );

        if (videoMetadata) {
          // Push the object matching the updated ProcessedTrainingVideo interface
          processedTrainingVideos.push({
            id: dbVideo.id,
            memberId: dbVideo.memberId,
            videoId: dbVideo.videoId,
            completedAt: dbVideo.completedAt,
            metadata: videoMetadata as ProcessedTrainingVideo['metadata'],
          });
        }
      }
    }
  }

  return (
    <div className="grid gap-6">
      <EmployeeCompletionChart
        employees={employees}
        policies={policies}
        // Use the correctly typed array, potentially casting if EmployeeCompletionChart expects a slightly different type
        trainingVideos={processedTrainingVideos as any}
      />
    </div>
  );
}
