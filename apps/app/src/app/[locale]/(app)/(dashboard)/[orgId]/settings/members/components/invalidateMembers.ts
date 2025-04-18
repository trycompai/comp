"use server";

import { revalidatePath } from "next/cache";

export async function invalidateMembers({
	organizationId,
}: {
	organizationId: string;
}) {
	await revalidatePath(`/${organizationId}/settings/members`);
}
