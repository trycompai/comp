"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { authActionClient } from "@/actions/safe-action";
import { z } from "zod";

import { db } from "@trycompai/db";

const switchDisplayFormatSchema = z.object({
  policyId: z.string(),
  format: z.enum(["EDITOR", "PDF"]),
});

export const switchPolicyDisplayFormatAction = authActionClient
  .inputSchema(switchDisplayFormatSchema)
  .metadata({
    name: "switch-policy-display-format",
    track: {
      event: "switch-policy-display-format",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { policyId, format } = parsedInput;
    const { session } = ctx;

    if (!session.activeOrganizationId) {
      return { success: false, error: "Not authorized" };
    }

    try {
      await db.policy.update({
        where: { id: policyId, organizationId: session.activeOrganizationId },
        data: {
          displayFormat: format,
        },
      });

      const headersList = await headers();
      let path =
        headersList.get("x-pathname") || headersList.get("referer") || "";
      path = path.replace(/\/[a-z]{2}\//, "/");
      revalidatePath(path);

      return { success: true };
    } catch (error) {
      console.error("Error switching policy display format:", error);
      return { success: false, error: "Failed to switch view." };
    }
  });
