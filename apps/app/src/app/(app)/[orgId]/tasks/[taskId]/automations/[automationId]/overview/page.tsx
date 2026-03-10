import { serverApi } from '@/lib/api-server';
import type {
  EvidenceAutomation,
  EvidenceAutomationRun,
  EvidenceAutomationVersion,
  Task,
} from '@db';
import { redirect } from 'next/navigation';
import { AutomationOverview } from './components/AutomationOverview';

type RunWithAutomationName = EvidenceAutomationRun & {
  evidenceAutomation: { name: string };
};

export default async function AutomationOverviewPage({
  params,
}: {
  params: Promise<{ taskId: string; orgId: string; automationId: string }>;
}) {
  const { taskId, orgId, automationId } = await params;

  const [taskRes, automationRes, runsRes, versionsRes] = await Promise.all([
    serverApi.get<Task>(`/v1/tasks/${taskId}`),
    serverApi.get<{ success: boolean; automation: EvidenceAutomation }>(
      `/v1/tasks/${taskId}/automations/${automationId}`,
    ),
    serverApi.get<RunWithAutomationName[]>(
      `/v1/tasks/${taskId}/automations/${automationId}/runs`,
    ),
    serverApi.get<{ success: boolean; versions: EvidenceAutomationVersion[] }>(
      `/v1/tasks/${taskId}/automations/${automationId}/versions?limit=10`,
    ),
  ]);

  const task = taskRes.data;
  if (!task || taskRes.error) {
    redirect(`/${orgId}/tasks`);
  }

  const automation = automationRes.data?.automation;
  if (!automation) {
    redirect(`/${orgId}/tasks/${taskId}`);
  }

  const runs = Array.isArray(runsRes.data) ? runsRes.data : [];
  const versions = versionsRes.data?.versions ?? [];

  return (
    <AutomationOverview
      task={task}
      automation={automation}
      initialRuns={runs}
      initialVersions={versions}
    />
  );
}
