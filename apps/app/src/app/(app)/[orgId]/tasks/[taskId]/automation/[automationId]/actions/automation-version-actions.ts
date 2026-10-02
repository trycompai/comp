'use server';

import { serverApi } from '@/lib/api-server';
import { z } from 'zod';
import {
  AutomationAccessError,
  requireAutomationAccess,
  requireAutomationPermission,
  requireScriptKey,
  scopeSchema,
} from './automation-security';
import { automationFailure, callEnterpriseApi, EnterpriseApiError } from './enterprise-api';

const publishResultSchema = z.object({
  success: z.literal(true),
  version: z.number().int().min(1),
  scriptKey: z.string().min(1),
});

export async function publishAutomation(
  orgId: string,
  taskId: string,
  automationId: string,
  changelog?: string,
) {
  try {
    const organizationId = await requireAutomationPermission('update');
    const scope = scopeSchema.parse({ orgId, taskId, automationId });
    const parsedChangelog = z.string().optional().parse(changelog);
    if (scope.orgId !== organizationId) throw new AutomationAccessError();
    await requireAutomationAccess({ organizationId, taskId, automationId });
    const result = publishResultSchema.parse(
      await callEnterpriseApi({
        endpoint: '/api/tasks-automations/publish',
        method: 'POST',
        body: scope,
      }),
    );
    requireScriptKey({ key: result.scriptKey, organizationId });
    const versionRes = await serverApi.post(
      `/v1/tasks/${encodeURIComponent(taskId)}/automations/${encodeURIComponent(automationId)}/versions`,
      { version: result.version, scriptKey: result.scriptKey, changelog: parsedChangelog },
    );
    if (versionRes.error || versionRes.status < 200 || versionRes.status >= 300) {
      throw new EnterpriseApiError('Failed to save published automation version');
    }
    const versionData = z
      .object({
        success: z.literal(true),
        version: z.object({ version: z.number().int().min(1) }).passthrough(),
      })
      .parse(versionRes.data);
    return { success: true as const, version: versionData.version };
  } catch (error) {
    return automationFailure(error);
  }
}

export async function restoreVersion(
  orgId: string,
  taskId: string,
  automationId: string,
  version: number,
) {
  try {
    const organizationId = await requireAutomationPermission('update');
    const scope = scopeSchema.parse({ orgId, taskId, automationId });
    if (scope.orgId !== organizationId) throw new AutomationAccessError();
    await requireAutomationAccess({ organizationId, taskId, automationId });
    z.object({ success: z.literal(true) }).parse(
      await callEnterpriseApi({
        endpoint: '/api/tasks-automations/restore-version',
        method: 'POST',
        body: { ...scope, version: z.number().int().min(1).parse(version) },
      }),
    );
    return { success: true as const };
  } catch (error) {
    return automationFailure(error);
  }
}

export async function updateEvaluationCriteria(
  taskId: string,
  automationId: string,
  evaluationCriteria: string,
) {
  try {
    const organizationId = await requireAutomationPermission('update');
    await requireAutomationAccess({ organizationId, taskId, automationId });
    const response = await serverApi.patch(
      `/v1/tasks/${encodeURIComponent(taskId)}/automations/${encodeURIComponent(automationId)}`,
      { evaluationCriteria: z.string().parse(evaluationCriteria) },
    );
    if (response.error) throw new EnterpriseApiError('Failed to update evaluation criteria');
    return { success: true as const };
  } catch (error) {
    return automationFailure(error);
  }
}

export async function toggleAutomationEnabled(
  taskId: string,
  automationId: string,
  isEnabled: boolean,
) {
  try {
    const organizationId = await requireAutomationPermission('update');
    await requireAutomationAccess({ organizationId, taskId, automationId });
    const response = await serverApi.patch(
      `/v1/tasks/${encodeURIComponent(taskId)}/automations/${encodeURIComponent(automationId)}`,
      { isEnabled: z.boolean().parse(isEnabled) },
    );
    if (response.error) throw new EnterpriseApiError('Failed to toggle automation');
    return { success: true as const };
  } catch (error) {
    return automationFailure(error);
  }
}
