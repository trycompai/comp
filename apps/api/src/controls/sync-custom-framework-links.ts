import { db, Prisma } from '@db';

type DbClient = Prisma.TransactionClient | typeof db;

export async function syncDirectLinksToCustomFrameworks({
  controlId,
  organizationId,
  client,
}: {
  controlId: string;
  organizationId: string;
  client?: DbClient;
}) {
  async function run(prisma: DbClient) {
    const hasCustomFrameworks = await prisma.frameworkInstance.count({
      where: { organizationId, customFrameworkId: { not: null } },
    });
    if (hasCustomFrameworks === 0) return;

    const customFiIds = await prisma.requirementMap.findMany({
      where: {
        controlId,
        archivedAt: null,
        frameworkInstance: {
          organizationId,
          customFrameworkId: { not: null },
        },
      },
      select: { frameworkInstanceId: true },
      distinct: ['frameworkInstanceId'],
    });

    if (customFiIds.length === 0) return;

    const control = await prisma.control.findUnique({
      where: { id: controlId, organizationId },
      include: {
        policies: {
          where: { archivedAt: null },
          select: { id: true },
        },
        tasks: {
          where: { archivedAt: null },
          select: { id: true },
        },
        controlDocumentTypes: {
          select: { formType: true },
        },
      },
    });

    if (!control) return;

    const fiIds = customFiIds.map((r) => r.frameworkInstanceId);

    await Promise.all([
      control.policies.length > 0 &&
        prisma.frameworkControlPolicyLink.createMany({
          data: fiIds.flatMap((frameworkInstanceId) =>
            control.policies.map((p) => ({
              frameworkInstanceId,
              controlId,
              policyId: p.id,
            })),
          ),
          skipDuplicates: true,
        }),
      control.tasks.length > 0 &&
        prisma.frameworkControlTaskLink.createMany({
          data: fiIds.flatMap((frameworkInstanceId) =>
            control.tasks.map((t) => ({
              frameworkInstanceId,
              controlId,
              taskId: t.id,
            })),
          ),
          skipDuplicates: true,
        }),
      control.controlDocumentTypes.length > 0 &&
        prisma.frameworkControlDocumentTypeLink.createMany({
          data: fiIds.flatMap((frameworkInstanceId) =>
            control.controlDocumentTypes.map((d) => ({
              frameworkInstanceId,
              controlId,
              formType: d.formType,
            })),
          ),
          skipDuplicates: true,
        }),
    ]);
  }

  if (client) {
    await run(client);
  } else {
    await db.$transaction((tx) => run(tx));
  }
}
