'use server';

import { z } from 'zod';
import { issueRunReceipt, verifyRunReceipt } from './automation-run-receipt';
import {
  AutomationAccessError,
  identifierSchema,
  requireAutomationAccess,
  requireAutomationPermission,
  scopeSchema,
} from './automation-security';
import { automationFailure, callEnterpriseApi } from './enterprise-api';

const executionSchema = scopeSchema.extend({ version: z.number().int().min(1).optional() });
const executionResultSchema = z.object({ runId: identifierSchema });

export async function executeAutomationScript(data: z.infer<typeof executionSchema>) {
  try {
    const organizationId = await requireAutomationPermission('update');
    const input = executionSchema.parse(data);
    if (input.orgId !== organizationId) throw new AutomationAccessError();
    await requireAutomationAccess({
      organizationId,
      taskId: input.taskId,
      automationId: input.automationId,
    });
    const result = executionResultSchema.parse(
      await callEnterpriseApi({
        endpoint: '/api/tasks-automations/trigger/execute',
        method: 'POST',
        body: input,
      }),
    );
    // Callers treat this as an opaque polling handle; the real enterprise ID
    // never authorizes a read on its own. The receipt survives server restarts.
    const runId = issueRunReceipt({
      organizationId,
      taskId: input.taskId,
      automationId: input.automationId,
      runId: result.runId,
    });
    return { success: true as const, data: { runId } };
  } catch (error) {
    return automationFailure(error);
  }
}

export async function getAutomationRunStatus(runId: string) {
  try {
    const organizationId = await requireAutomationPermission('read');
    const receipt = verifyRunReceipt({ token: runId, organizationId });
    await requireAutomationAccess(receipt);
    const result = await callEnterpriseApi({
      endpoint: `/api/tasks-automations/runs/${encodeURIComponent(receipt.runId)}`,
    });
    return { success: true as const, data: result };
  } catch (error) {
    return automationFailure(error);
  }
}
