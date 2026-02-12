import { db, Prisma } from '@db';

/**
 * Removes a member's node (and all connected edges) from the org chart.
 * No-op if the org chart doesn't exist or the member has no node on it.
 */
export async function removeMemberFromOrgChart(
  organizationId: string,
  memberId: string,
): Promise<void> {
  const orgChart = await db.organizationChart.findUnique({
    where: { organizationId },
  });

  if (!orgChart) return;

  const chartNodes = (Array.isArray(orgChart.nodes) ? orgChart.nodes : []) as Array<
    Record<string, unknown>
  >;
  const chartEdges = (Array.isArray(orgChart.edges) ? orgChart.edges : []) as Array<
    Record<string, unknown>
  >;

  const removedNodeIds = new Set(
    chartNodes
      .filter((n) => {
        const data = n.data as Record<string, unknown> | undefined;
        return data?.memberId === memberId;
      })
      .map((n) => n.id as string),
  );

  if (removedNodeIds.size === 0) return;

  const updatedNodes = chartNodes.filter((n) => !removedNodeIds.has(n.id as string));
  const updatedEdges = chartEdges.filter(
    (e) =>
      !removedNodeIds.has(e.source as string) && !removedNodeIds.has(e.target as string),
  );

  await db.organizationChart.update({
    where: { organizationId },
    data: {
      nodes: updatedNodes as unknown as Prisma.InputJsonValue,
      edges: updatedEdges as unknown as Prisma.InputJsonValue,
    },
  });
}
