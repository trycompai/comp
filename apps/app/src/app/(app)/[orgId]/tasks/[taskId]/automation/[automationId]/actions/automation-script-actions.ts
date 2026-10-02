'use server';

import { db } from '@db/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { z } from 'zod';
import {
  AutomationAccessError,
  identifierSchema,
  requireAutomationPermission,
  requireScriptKey,
} from './automation-security';
import { automationFailure, callEnterpriseApi } from './enterprise-api';

const uploadSchema = z
  .object({
    orgId: identifierSchema,
    taskId: identifierSchema,
    content: z.string(),
    type: z.string().optional(),
  })
  .strict();

export async function uploadAutomationScript(data: z.infer<typeof uploadSchema>) {
  try {
    const organizationId = await requireAutomationPermission('update');
    const input = uploadSchema.parse(data);
    if (input.orgId !== organizationId) throw new AutomationAccessError();
    const task = await db.task.findUnique({
      where: { id: input.taskId },
      select: { organizationId: true },
    });
    if (task?.organizationId !== organizationId) throw new AutomationAccessError();
    const result = await callEnterpriseApi({
      endpoint: '/api/tasks-automations/s3/upload',
      method: 'POST',
      body: input,
    });
    const requestHeaders = await headers();
    const path = requestHeaders.get('x-pathname') || requestHeaders.get('referer');
    if (path) revalidatePath(path.replace(/\/[a-z]{2}\//, '/'));
    return { success: true as const, data: result };
  } catch (error) {
    return automationFailure(error);
  }
}

export async function getAutomationScript(key: string) {
  try {
    const organizationId = await requireAutomationPermission('read');
    const parsedKey = z.string().min(1).max(2048).parse(key);
    requireScriptKey({ key: parsedKey, organizationId });
    const result = await callEnterpriseApi({
      endpoint: '/api/tasks-automations/s3/get',
      params: { key: parsedKey },
    });
    return { success: true as const, data: result };
  } catch (error) {
    return automationFailure(error);
  }
}

export async function listAutomationScripts(orgId: string) {
  try {
    const organizationId = await requireAutomationPermission('read');
    if (identifierSchema.parse(orgId) !== organizationId) throw new AutomationAccessError();
    const result = await callEnterpriseApi({
      endpoint: '/api/tasks-automations/s3/list',
      params: { orgId: organizationId },
    });
    return { success: true as const, data: result };
  } catch (error) {
    return automationFailure(error);
  }
}

export async function analyzeAutomationWorkflow(scriptContent: string) {
  try {
    await requireAutomationPermission('update');
    const result = await callEnterpriseApi({
      endpoint: '/api/tasks-automations/workflow/analyze',
      method: 'POST',
      body: { scriptContent: z.string().parse(scriptContent) },
    });
    return { success: true as const, data: result };
  } catch (error) {
    return automationFailure(error);
  }
}
