// update-organization-action.ts

"use server";

import { createOrganizationAndConnectUser } from "@/auth/org";
import { db } from "@bubba/db";
import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { authActionClient } from "../safe-action";
import { organizationSchema } from "../schema";

export const createOrganizationAction = authActionClient
  .schema(organizationSchema)
  .metadata({
    name: "create-organization",
    track: {
      event: "create-organization",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    console.log("Starting organization creation process...");

    const cookieStore = await cookies();
    const { name, website } = parsedInput;
    const { id: userId, organizationId } = ctx.user;

    if (!name || !website) {
      console.log("Invalid input detected:", { name, website });

      throw new Error("Invalid user input");
    }

    if (!organizationId) {
      await createOrganizationAndConnectUser({
        userId,
        normalizedEmail: ctx.user.email!,
      });
    }

    const organization = await db.organization.findFirst({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
    });

    if (!organization) {
      throw new Error("Organization not found");
    }

    try {
      await db.$transaction(async () => {
        await db.organization.upsert({
          where: {
            id: organization.id,
          },
          update: {
            name,
            website,
          },
          create: {
            name,
            website,
          },
        });

        await db.user.update({
          where: {
            id: userId,
          },
          data: {
            onboarded: true,
          },
        });
      });

      revalidateTag(`user_${userId}`);
      revalidateTag(`organization_${organizationId}`);

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error during organization update:", error);
      throw new Error("Failed to update organization");
    }
  });
