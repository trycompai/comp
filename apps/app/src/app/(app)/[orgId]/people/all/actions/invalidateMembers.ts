"use server";

import { revalidatePath } from "next/cache";

export async function invalidateMembers({
  organizationId,
}: {
  organizationId: string;
}) {
  // Ensure correct path is used for revalidation
  return revalidatePath(`/${organizationId}/settings/users`);
}
