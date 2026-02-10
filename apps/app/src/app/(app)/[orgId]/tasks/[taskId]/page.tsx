import { getFeatureFlags } from '@/app/posthog';
import { serverApi } from '@/lib/api-server';
import { auth } from '@/utils/auth';
import type {
  Control,
  EvidenceAutomation,
  EvidenceAutomationRun,
  Member,
  Task,
  User,
} from '@db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SingleTask } from './components/SingleTask';

type TaskWithControls = Task & { controls: Control[] };
type AutomationWithRuns = EvidenceAutomation & {
  runs: EvidenceAutomationRun[];
};

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string }>;
}) {
  const { taskId, orgId } = await params;

  const [taskRes, automationsRes, membersRes] = await Promise.all([
    serverApi.get<TaskWithControls>(`/v1/tasks/${taskId}`),
    serverApi.get<{ success: boolean; automations: AutomationWithRuns[] }>(
      `/v1/tasks/${taskId}/automations`,
    ),
    serverApi.get<{ data: (Member & { user: User })[] }>('/v1/people'),
  ]);

  const task = taskRes.data;
  if (!task || taskRes.error) {
    redirect(`/${orgId}/tasks`);
  }

  const automations = automationsRes.data?.automations ?? [];
  const members = membersRes.data?.data ?? [];

  // Feature flags and platform admin check
  let isWebAutomationsEnabled = false;
  let isPlatformAdmin = false;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user?.id) {
    const flags = await getFeatureFlags(session.user.id);
    isWebAutomationsEnabled =
      flags['is-web-automations-enabled'] === true ||
      flags['is-web-automations-enabled'] === 'true';

    // Find current user's member to check isPlatformAdmin
    const currentMember = members.find(
      (m) => m.userId === session.user.id,
    );
    isPlatformAdmin = currentMember?.user?.isPlatformAdmin ?? false;
  }

  return (
    <SingleTask
      initialTask={task}
      initialMembers={members}
      initialAutomations={automations}
      isWebAutomationsEnabled={isWebAutomationsEnabled}
      isPlatformAdmin={isPlatformAdmin}
    />
  );
}
