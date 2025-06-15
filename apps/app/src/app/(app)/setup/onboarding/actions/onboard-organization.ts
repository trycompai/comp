"use server";

import { authActionClient } from "@/actions/safe-action";
import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { steps } from "../lib/constants";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { onboardOrganization as onboardOrganizationTask } from "@/jobs/tasks/onboarding/onboard-organization";
import { companyDetailsSchema } from "../lib/constants";

export const onboardOrganization = authActionClient
  .schema(companyDetailsSchema)
  .metadata({
    name: "onboard-organization",
    track: {
      event: "onboard-organization",
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
          name: parsedInput.legalName,
          website: parsedInput.website,
          context: {
            create: steps
              .filter(
                (step) => step.key !== "legalName" && step.key !== "website",
              )
              .map((step) => ({
                question: step.question,
                answer: parsedInput[step.key as keyof typeof parsedInput],
                tags: ["onboarding"],
              })),
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

      const handle = await tasks.trigger<typeof onboardOrganizationTask>(
        "onboard-organization",
        {
          organizationId: orgId,
        },
        {
          queue: {
            name: "onboard-organization",
            concurrencyLimit: 5,
          },
          concurrencyKey: orgId,
        },
      );

      // Set triggerJobId to signal that the job is running.
      await db.onboarding.update({
        where: {
          organizationId: orgId,
        },
        data: { triggerJobId: handle.id },
      });

      revalidatePath("/");
      revalidatePath(`/${orgId}`);
      revalidatePath("/setup/onboarding");

      (await cookies()).set("publicAccessToken", handle.publicAccessToken);

      return {
        success: true,
        handle: handle.id,
        publicAccessToken: handle.publicAccessToken,
        organizationId: orgId,
      };
    } catch (error) {
      console.error("Error during organization creation/update:", error);

      throw new Error("Failed to create or update organization structure");
    }
  });
