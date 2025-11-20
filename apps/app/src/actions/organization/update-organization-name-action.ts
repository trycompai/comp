// update-organization-name-action.ts

"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { db } from "@trycompai/db";

import { authActionClient } from "../safe-action";
import { organizationNameSchema } from "../schema";

export const updateOrganizationNameAction = authActionClient
  .inputSchema(organizationNameSchema)
  .metadata({
    name: "update-organization-name",
    track: {
      event: "update-organization-name",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    const { name } = parsedInput;
    const { activeOrganizationId } = ctx.session;

    if (!name) {
      throw new Error("Invalid user input");
    }

    if (!activeOrganizationId) {
      throw new Error("No active organization");
    }

    try {
      await db.$transaction(async () => {
        await db.organization.update({
          where: { id: activeOrganizationId ?? "" },
          data: { name },
        });
      });

      revalidatePath("/settings");
      revalidateTag(`organization_${activeOrganizationId}`, { expire: 0 });

      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      throw new Error("Failed to update organization name");
    }
  });
