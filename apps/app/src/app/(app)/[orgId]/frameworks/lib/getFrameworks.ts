import { db } from "@trycompai/db";

export async function getFrameworks(organizationId: string) {
  const frameworks = await db.frameworkInstance.findMany({
    where: {
      organizationId,
    },
  });

  return frameworks;
}
