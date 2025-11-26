import { trainingVideos } from '@/lib/data/training-videos';
import { db } from '@db';

export async function getPeopleScore(organizationId: string) {
  // Get all active members (employees and contractors)
  const allMembers = await db.member.findMany({
    where: {
      organizationId,
      deactivated: false,
    },
    include: {
      user: true,
    },
  });

  // Filter to only employees and contractors
  const employees = allMembers.filter((member) => {
    const roles = member.role.includes(',') ? member.role.split(',') : [member.role];
    return roles.includes('employee') || roles.includes('contractor');
  });

  if (employees.length === 0) {
    return {
      totalMembers: 0,
      completedMembers: 0,
    };
  }

  // Get all required policies (published, required to sign, not archived)
  const requiredPolicies = await db.policy.findMany({
    where: {
      organizationId,
      isRequiredToSign: true,
      status: 'published',
      isArchived: false,
    },
  });

  // Get all training video completions for these employees
  const trainingVideoCompletions = await db.employeeTrainingVideoCompletion.findMany({
    where: {
      memberId: {
        in: employees.map((e) => e.id),
      },
    },
  });

  // Get required training video IDs (sat-1 through sat-5)
  const requiredTrainingVideoIds = trainingVideos.map((video) => video.id);

  // Get fleet instance for device checks
  // const fleet = await getFleetInstance();

  // Check each employee's completion status
  let completedMembers = 0;

  for (const employee of employees) {
    // 1. Check if all policies are accepted
    const hasAcceptedAllPolicies =
      requiredPolicies.length === 0 ||
      requiredPolicies.every((policy) => policy.signedBy.includes(employee.id));

    // 2. Check if all training videos are completed
    const employeeVideoCompletions = trainingVideoCompletions.filter(
      (completion) => completion.memberId === employee.id,
    );
    const completedVideoIds = employeeVideoCompletions
      .filter((completion) => completion.completedAt !== null)
      .map((completion) => completion.videoId);
    const hasCompletedAllTraining = requiredTrainingVideoIds.every((videoId) =>
      completedVideoIds.includes(videoId),
    );

    // 3. Check if device is secure
    // let hasSecureDevice = false;

    /*  if (employee.fleetDmLabelId) {
      try {
        const deviceResponse = await fleet.get(`/labels/${employee.fleetDmLabelId}/hosts`);
        const device = deviceResponse.data.hosts?.[0];

        if (device) {
          const deviceWithPolicies = await fleet.get(`/hosts/${device.id}`);
          const fleetPolicies = deviceWithPolicies.data.host.policies || [];
          hasSecureDevice = fleetPolicies.every(
            (policy: { response: string }) => policy.response === 'pass',
          );
        }
      } catch (error) {
        // If there's an error fetching device, consider it not secure
        hasSecureDevice = false;
      }
    } */

    if (hasAcceptedAllPolicies && hasCompletedAllTraining) {
      completedMembers++;
    }
  }

  return {
    totalMembers: employees.length,
    completedMembers,
  };
}
