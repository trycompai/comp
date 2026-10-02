import { auth } from '@/utils/auth';
import { db } from '@db/server';
import { headers } from 'next/headers';
import { z } from 'zod';

export const identifierSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_-]+$/);
export const scopeSchema = z
  .object({
    orgId: identifierSchema,
    taskId: identifierSchema,
    automationId: identifierSchema,
  })
  .strict();

export class AutomationAccessError extends Error {
  constructor() {
    super('Unauthorized');
  }
}

export async function requireAutomationPermission(action: 'read' | 'update') {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const organizationId = session?.session.activeOrganizationId;
  const userId = session?.user.id;
  if (!organizationId || !userId) throw new AutomationAccessError();

  // A saved active organization is not proof of current membership.
  const member = await db.member.findFirst({
    where: { organizationId, userId, deactivated: false },
    select: { id: true },
  });
  if (!member) throw new AutomationAccessError();

  // The API owns built-in and custom role permission resolution.
  const body = { organizationId, permission: { task: [action] } };
  const permission = await auth.api.hasPermission({ headers: requestHeaders, body });
  if (!permission.success) throw new AutomationAccessError();
  return organizationId;
}

export async function requireAutomationAccess({
  automationId,
  organizationId,
  taskId,
}: {
  automationId: string;
  organizationId: string;
  taskId?: string;
}) {
  const automation = await db.evidenceAutomation.findUnique({
    where: { id: identifierSchema.parse(automationId) },
    select: { taskId: true, task: { select: { organizationId: true } } },
  });
  if (
    automation?.task.organizationId !== organizationId ||
    (taskId !== undefined && automation.taskId !== taskId)
  )
    throw new AutomationAccessError();
  return automation;
}

export function requireScriptKey({ key, organizationId }: { key: string; organizationId: string }) {
  if (!key.startsWith(`${organizationId}/`) || key.includes('..')) {
    throw new AutomationAccessError();
  }
}
