import { db, Prisma } from '@db';
import { isUserUnsubscribed } from '@trycompai/email';
import { Logger } from '@nestjs/common';
import { triggerEmail } from '../../email/trigger-email';
import { UnassignedItemsNotificationEmail } from '../../email/templates/unassigned-items-notification';

export interface UnassignedItem {
  type: 'task' | 'policy' | 'risk' | 'vendor';
  id: string;
  name: string;
}

const logger = new Logger('MemberDeactivation');

/**
 * Collect all items assigned to a member (tasks, policies, risks, vendors).
 */
export async function collectAssignedItems({
  memberId,
  organizationId,
}: {
  memberId: string;
  organizationId: string;
}): Promise<UnassignedItem[]> {
  const [tasks, policies, risks, vendors] = await Promise.all([
    db.task.findMany({
      where: { assigneeId: memberId, organizationId },
      select: { id: true, title: true },
    }),
    db.policy.findMany({
      where: { assigneeId: memberId, organizationId },
      select: { id: true, name: true },
    }),
    db.risk.findMany({
      where: { assigneeId: memberId, organizationId },
      select: { id: true, title: true },
    }),
    db.vendor.findMany({
      where: { assigneeId: memberId, organizationId },
      select: { id: true, name: true },
    }),
  ]);

  const items: UnassignedItem[] = [];
  for (const t of tasks) items.push({ type: 'task', id: t.id, name: t.title });
  for (const p of policies)
    items.push({ type: 'policy', id: p.id, name: p.name });
  for (const r of risks) items.push({ type: 'risk', id: r.id, name: r.title });
  for (const v of vendors)
    items.push({ type: 'vendor', id: v.id, name: v.name });
  return items;
}

/**
 * Clear all assigneeId references for a member across tasks, policies, risks, vendors.
 */
export async function clearAssignments({
  memberId,
  organizationId,
}: {
  memberId: string;
  organizationId: string;
}): Promise<void> {
  await Promise.all([
    db.task.updateMany({
      where: { assigneeId: memberId, organizationId },
      data: { assigneeId: null },
    }),
    db.policy.updateMany({
      where: { assigneeId: memberId, organizationId },
      data: { assigneeId: null },
    }),
    db.risk.updateMany({
      where: { assigneeId: memberId, organizationId },
      data: { assigneeId: null },
    }),
    db.vendor.updateMany({
      where: { assigneeId: memberId, organizationId },
      data: { assigneeId: null },
    }),
  ]);
}

/**
 * Remove a member's node (and connected edges) from the organization chart.
 */
export async function removeMemberFromOrgChart({
  organizationId,
  memberId,
}: {
  organizationId: string;
  memberId: string;
}): Promise<void> {
  const orgChart = await db.organizationChart.findUnique({
    where: { organizationId },
  });
  if (!orgChart) return;

  const chartNodes = (
    Array.isArray(orgChart.nodes) ? orgChart.nodes : []
  ) as Array<Record<string, unknown>>;
  const chartEdges = (
    Array.isArray(orgChart.edges) ? orgChart.edges : []
  ) as Array<Record<string, unknown>>;

  const removedNodeIds = new Set(
    chartNodes
      .filter((n) => {
        const data = n.data as Record<string, unknown> | undefined;
        return data?.memberId === memberId;
      })
      .map((n) => n.id as string),
  );

  if (removedNodeIds.size === 0) return;

  const updatedNodes = chartNodes.filter(
    (n) => !removedNodeIds.has(n.id as string),
  );
  const updatedEdges = chartEdges.filter(
    (e) =>
      !removedNodeIds.has(e.source as string) &&
      !removedNodeIds.has(e.target as string),
  );

  await db.organizationChart.update({
    where: { organizationId },
    data: {
      nodes: updatedNodes as unknown as Prisma.InputJsonValue,
      edges: updatedEdges as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Send an email notification to the org owner about unassigned items.
 * Non-fatal: errors are logged but not thrown.
 */
export async function notifyOwnerOfUnassignedItems({
  organizationId,
  removedMemberName,
  unassignedItems,
}: {
  organizationId: string;
  removedMemberName: string;
  unassignedItems: UnassignedItem[];
}): Promise<void> {
  if (unassignedItems.length === 0) return;

  try {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    if (!organization) return;

    const owner = await db.member.findFirst({
      where: {
        organizationId,
        role: { contains: 'owner' },
        deactivated: false,
      },
      include: { user: true },
    });
    if (!owner) return;

    const unsubscribed = await isUserUnsubscribed(
      db,
      owner.user.email,
      'unassignedItemsNotifications',
    );
    if (unsubscribed) return;

    const userName = owner.user.name || owner.user.email || 'Owner';
    await triggerEmail({
      to: owner.user.email,
      subject: `Member removed from ${organization.name} - items require reassignment`,
      react: UnassignedItemsNotificationEmail({
        email: owner.user.email,
        userName,
        organizationName: organization.name,
        organizationId,
        removedMemberName,
        unassignedItems,
      }),
    });
  } catch (emailError) {
    logger.error('Failed to send unassigned items notification:', emailError);
  }
}
