'use server';

import { z } from 'zod';
import { requireAutomationAccess, requireAutomationPermission } from './automation-security';
import { automationFailure, callEnterpriseApi } from './enterprise-api';

export async function loadChatHistory(automationId: string, offset = 0, limit = 50) {
  try {
    const organizationId = await requireAutomationPermission('read');
    await requireAutomationAccess({ organizationId, automationId });
    const result = z
      .object({
        messages: z.array(z.unknown()),
        total: z.number(),
        hasMore: z.boolean(),
      })
      .parse(
        await callEnterpriseApi({
          endpoint: '/api/tasks-automations/chat/history',
          params: {
            automationId,
            offset: z.number().int().min(0).parse(offset).toString(),
            limit: z.number().int().min(1).max(100).parse(limit).toString(),
          },
        }),
      );
    return { success: true as const, data: result };
  } catch (error) {
    return automationFailure(error);
  }
}

export async function saveChatHistory(automationId: string, messages: unknown[]) {
  try {
    const organizationId = await requireAutomationPermission('update');
    await requireAutomationAccess({ organizationId, automationId });
    await callEnterpriseApi({
      endpoint: '/api/tasks-automations/chat/save',
      method: 'POST',
      body: { automationId, messages: z.array(z.unknown()).parse(messages) },
    });
    return { success: true as const };
  } catch (error) {
    return automationFailure(error);
  }
}
