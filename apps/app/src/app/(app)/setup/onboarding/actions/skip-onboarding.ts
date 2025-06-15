"use server";

import { authActionClient } from "@/actions/safe-action";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

const skipOnboardingSchema = z.object({
  legalName: z.string(),
  website: z.string().url(),
});

export const skipOnboarding = authActionClient
  .schema(skipOnboardingSchema)
  .metadata({
    name: "skip-onboarding",
    track: {
      event: "skip-onboarding",
      channel: "server",
    },
  })
  .action(async ({ parsedInput, ctx }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.session?.activeOrganizationId) {
        return {
          success: false,
          error: "Not authorized - no active organization found.",
        };
      }

      const orgId = session.session.activeOrganizationId;

      await db.organization.update({
        where: {
          id: orgId,
        },
        data: {
          website: parsedInput.website,
          name: parsedInput.legalName,
          onboarding: {
            update: {
              completed: true,
            },
          },
        },
      });

      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: {
          organizationId: orgId,
        },
      });

      const userOrgs = await db.member.findMany({
        where: {
          userId: session.user.id,
        },
        select: {
          organizationId: true,
        },
      });

      for (const org of userOrgs) {
        revalidatePath(`/${org.organizationId}`);
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("Error during organization creation/update:", error);

      throw new Error("Failed to create or update organization structure");
    }
  });
