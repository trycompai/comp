import { requireAutomationAccess } from './automation-security';
import { EnterpriseApiError } from './enterprise-api';

export async function requireUnchangedAutomationCriteria({
  organizationId,
  taskId,
  automationId,
  evaluationCriteria,
}: {
  organizationId: string;
  taskId: string;
  automationId: string;
  evaluationCriteria: string | null;
}) {
  // New automations can initialize criteria; existing criteria require an explicit edit.
  if (!evaluationCriteria) return;

  const automation = await requireAutomationAccess({ organizationId, taskId, automationId });
  if (automation.evaluationCriteria !== evaluationCriteria) {
    throw new EnterpriseApiError(
      'Evaluation criteria changed during the request. Review the saved criteria and retry.',
    );
  }
}
