import { db } from '@trycompai/db';

const TRAINING_VIDEO_IDS = ['sat-1', 'sat-2', 'sat-3', 'sat-4', 'sat-5'];

export async function getOverviewScores(organizationId: string) {
  const [allPolicies, allTasks, employees, onboarding] = await Promise.all([
    db.policy.findMany({ where: { organizationId } }),
    db.task.findMany({ where: { organizationId } }),
    db.member.findMany({
      where: { organizationId, deactivated: false },
      include: { user: true },
    }),
    db.onboarding.findUnique({
      where: { organizationId },
      select: { triggerJobId: true },
    }),
  ]);

  // Policy breakdown
  const publishedPolicies = allPolicies.filter((p) => p.status === 'published');
  const draftPolicies = allPolicies.filter((p) => p.status === 'draft');
  const policiesInReview = allPolicies.filter(
    (p) => p.status === 'needs_review',
  );
  const unpublishedPolicies = allPolicies.filter(
    (p) => p.status === 'draft' || p.status === 'needs_review',
  );

  // Task breakdown
  const doneTasks = allTasks.filter(
    (t) => t.status === 'done' || t.status === 'not_relevant',
  );
  const incompleteTasks = allTasks.filter(
    (t) => t.status === 'todo' || t.status === 'in_progress',
  );

  // People score
  const activeEmployees = employees.filter((m) => {
    const roles = m.role.includes(',') ? m.role.split(',') : [m.role];
    return roles.includes('employee') || roles.includes('contractor');
  });

  let completedMembers = 0;

  if (activeEmployees.length > 0) {
    const requiredPolicies = allPolicies.filter(
      (p) =>
        p.isRequiredToSign && p.status === 'published' && !p.isArchived,
    );

    const trainingCompletions =
      await db.employeeTrainingVideoCompletion.findMany({
        where: { memberId: { in: activeEmployees.map((e) => e.id) } },
      });

    for (const emp of activeEmployees) {
      const hasAcceptedAllPolicies =
        requiredPolicies.length === 0 ||
        requiredPolicies.every((p) => p.signedBy.includes(emp.id));

      const empCompletions = trainingCompletions.filter(
        (c) => c.memberId === emp.id,
      );
      const completedVideoIds = empCompletions
        .filter((c) => c.completedAt !== null)
        .map((c) => c.videoId);
      const hasCompletedAllTraining = TRAINING_VIDEO_IDS.every((vid) =>
        completedVideoIds.includes(vid),
      );

      if (hasAcceptedAllPolicies && hasCompletedAllTraining) {
        completedMembers++;
      }
    }
  }

  return {
    policies: {
      total: allPolicies.length,
      published: publishedPolicies.length,
      draftPolicies,
      policiesInReview,
      unpublishedPolicies,
    },
    tasks: {
      total: allTasks.length,
      done: doneTasks.length,
      incompleteTasks,
    },
    people: {
      total: activeEmployees.length,
      completed: completedMembers,
    },
    onboardingTriggerJobId: onboarding?.triggerJobId ?? null,
  };
}

export async function getCurrentMember(
  organizationId: string,
  userId: string,
) {
  const member = await db.member.findFirst({
    where: { userId, organizationId, deactivated: false },
    select: { id: true, role: true },
  });
  return member;
}

interface FrameworkWithControlsForScoring {
  controls: {
    id: string;
    policies: { id: string; status: string }[];
  }[];
}

interface TaskWithControls {
  id: string;
  status: string;
  controls: { id: string }[];
}

export function computeFrameworkComplianceScore(
  framework: FrameworkWithControlsForScoring,
  tasks: TaskWithControls[],
): number {
  const controls = framework.controls ?? [];

  // Deduplicate policies by id across all controls
  const uniquePoliciesMap = new Map<string, { id: string; status: string }>();
  for (const c of controls) {
    for (const p of c.policies || []) {
      uniquePoliciesMap.set(p.id, p);
    }
  }
  const uniquePolicies = Array.from(uniquePoliciesMap.values());

  const totalPolicies = uniquePolicies.length;
  const publishedPolicies = uniquePolicies.filter(
    (p) => p.status === 'published',
  ).length;
  const policyRatio = totalPolicies > 0 ? publishedPolicies / totalPolicies : 0;

  const controlIds = controls.map((c) => c.id);
  const uniqueTaskMap = new Map<string, TaskWithControls>();
  for (const t of tasks) {
    if (t.controls.some((c) => controlIds.includes(c.id))) {
      uniqueTaskMap.set(t.id, t);
    }
  }
  const uniqueTasks = Array.from(uniqueTaskMap.values());
  const totalTasks = uniqueTasks.length;
  const doneTasks = uniqueTasks.filter(
    (t) => t.status === 'done' || t.status === 'not_relevant',
  ).length;
  const taskRatio = totalTasks > 0 ? doneTasks / totalTasks : 1;

  return Math.round(((policyRatio + taskRatio) / 2) * 100);
}
