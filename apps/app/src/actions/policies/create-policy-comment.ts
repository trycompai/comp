"use server";

import { db } from "@bubba/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { authActionClient } from "../safe-action";
import { createPolicyCommentSchema } from "../schema";

export const createPolicyCommentAction = authActionClient
  .schema(createPolicyCommentSchema)
  .metadata({
    name: "create-policy-comment",
    track: {
      event: "create-policy-comment",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, content } = parsedInput;
    const { user } = ctx;

    if (!user.id || !user.organizationId) {
      throw new Error("Invalid user input");
    }

    await db.policyComments.create({
      data: {
        organizationPolicyId: policyId,
        content,
        ownerId: user.id,
        organizationId: user.organizationId,
      },
    });

    revalidatePath(`/policies/all/${policyId}`);
    revalidateTag(`policy_${user.organizationId}`);

    return { success: true };
  });
