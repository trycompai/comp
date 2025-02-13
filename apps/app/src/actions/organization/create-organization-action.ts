// update-organization-action.ts

"use server";

import { createOrganizationAndConnectUser } from "@/auth/org";
import type { createDefaultPoliciesTask } from "@/jobs/tasks/organization/create-default-policies";
import { addDomainToVercel, removeDomainFromVercelProject } from "@/lib/domains";
import { db } from "@bubba/db";
import { tasks } from "@trigger.dev/sdk/v3";
import { revalidateTag } from "next/cache";
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
    const { name, website, subdomain } = parsedInput;
    const { id: userId, organizationId } = ctx.user;

    if (!name || !website) {
      console.log("Invalid input detected:", { name, website });
      throw new Error("Invalid user input");
    }

    const hasVercelConfig = Boolean(
      process.env.NEXT_PUBLIC_VERCEL_URL &&
      process.env.VERCEL_ACCESS_TOKEN &&
      process.env.VERCEL_TEAM_ID &&
      process.env.VERCEL_PROJECT_ID
    );

    if (hasVercelConfig && subdomain) {
      try {
        await addDomainToVercel(`${subdomain}.${process.env.NEXT_PUBLIC_VERCEL_URL}`);
      } catch (error) {
        console.error("Failed to add domain to Vercel:", error);
        throw new Error("Failed to set up subdomain");
      }
    }

    if (!organizationId) {
      await createOrganizationAndConnectUser({
        userId,
        normalizedEmail: ctx.user.email!,
        subdomain: hasVercelConfig ? (subdomain || "") : "",
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
            subdomain: hasVercelConfig ? (subdomain || "") : "",
          },
          create: {
            name,
            website,
            subdomain: hasVercelConfig ? (subdomain || "") : "",
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

      // await tasks.trigger<typeof createDefaultPoliciesTask>(
      //   "create-default-policies",
      //   {
      //     ownerId: userId,
      //     organizationId: organization.id,
      //     organizationName: name,
      //   }
      // );

      revalidateTag(`user_${userId}`);
      revalidateTag(`organization_${organizationId}`);

      return {
        success: true,
      };
    } catch (error) {
      if (hasVercelConfig && subdomain) {
        try {
          await removeDomainFromVercelProject(`${subdomain}.${process.env.NEXT_PUBLIC_VERCEL_URL}`);
        } catch (cleanupError) {
          console.error("Failed to clean up subdomain after error:", cleanupError);
        }
      }

      console.error("Error during organization update:", error);
      throw new Error("Failed to update organization");
    }
  });
