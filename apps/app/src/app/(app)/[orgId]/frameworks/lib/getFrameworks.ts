import { db } from '@db/server';

export async function getFrameworks(organizationId: string) {
  const frameworks = await db.frameworkInstance.findMany({
    where: {
      organizationId,
    },
  });

  return frameworks;
}
