"use server";

import { auth } from "@/utils/auth";
import { db } from "@comp/db";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { authActionClient } from "../safe-action";
import { organizationSchema } from "../schema";
import { createStripeCustomer } from "./lib/create-stripe-customer";
import { initializeOrganization } from "./lib/initialize-organization";
import { createFleetLabelForOrg } from "@/jobs/tasks/device/create-fleet-label-for-org";

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
    const { frameworkIds } = parsedInput;

    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.session.activeOrganizationId) {
        throw new Error("User is not part of an organization");
      }

      await db.onboarding.create({
        data: {
          organizationId: session.session.activeOrganizationId,
          completed: false,
        },
      });

      const organizationId = session.session.activeOrganizationId;

      const stripeCustomerId = await createStripeCustomer({
        name: "My Organization",
        email: session.user.email,
        organizationId,
      });

      if (!stripeCustomerId) {
        throw new Error("Failed to create Stripe customer");
      }

      await db.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId },
      });

      await initializeOrganization({ frameworkIds, organizationId });

      await auth.api.setActiveOrganization({
        headers: await headers(),
        body: {
          organizationId,
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

      await createFleetLabelForOrg.trigger({
        organizationId,
      });

      return {
        success: true,
        organizationId,
      };
    } catch (error) {
      console.error("Error during organization creation/update:", error);

      throw new Error("Failed to create or update organization structure");
    }
  });
